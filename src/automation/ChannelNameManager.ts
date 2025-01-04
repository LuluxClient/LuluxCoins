import { Channel, TextChannel, Client } from 'discord.js';
import { config } from '../config';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface SavedChannelName {
    channelId: string;
    originalName: string;
    endTime: number;
    guildId: string;
}

interface BackupChannelName {
    channelId: string;
    originalName: string;
    guildId: string;
}

export class ChannelNameManager {
    private savedNames: Map<string, SavedChannelName> = new Map();
    private backupNames: Map<string, BackupChannelName> = new Map();
    private checkInterval: NodeJS.Timeout;
    private client: Client | null = null;
    private readonly LOGS_CHANNEL = '1179886753461571644';
    private readonly DB_FOLDER = join(process.cwd(), 'src', 'automation', 'database');
    private readonly BACKUP_FILE = join(this.DB_FOLDER, 'channelNames.json');

    constructor() {
        this.checkInterval = setInterval(() => this.checkExpiredNames(), 60000);
    }

    public async setClient(client: Client) {
        this.client = client;
        
        // Créer le dossier database s'il n'existe pas
        if (!existsSync(this.DB_FOLDER)) {
            await mkdir(this.DB_FOLDER, { recursive: true });
            console.log('Created database folder:', this.DB_FOLDER);
        }
        
        await this.loadBackup();
        await this.backupChannelNames();
    }

    private async loadBackup() {
        try {
            const data = await readFile(this.BACKUP_FILE, 'utf-8');
            const backup = JSON.parse(data);
            this.backupNames = new Map(Object.entries(backup));
            console.log('Loaded channel names backup from file');
        } catch (error) {
            console.log('No existing backup file found, will create new backup');
        }
    }

    private async saveBackup() {
        try {
            const backup = Object.fromEntries(this.backupNames);
            await writeFile(this.BACKUP_FILE, JSON.stringify(backup, null, 2));
            console.log('Saved channel names backup to file');
        } catch (error) {
            console.error('Error saving channel names backup:', error);
        }
    }

    private async backupChannelNames() {
        if (!this.client) return;

        try {
            const guilds = await this.client.guilds.fetch();
            for (const [, guild] of guilds) {
                const fullGuild = await guild.fetch();
                const channels = await fullGuild.channels.fetch();
                
                channels.forEach(channel => {
                    if (channel && channel.isTextBased()) {
                        // Ne pas sauvegarder si le nom est déjà dans la liste des noms drôles
                        if (!config.funnyChannelNames.includes(channel.name)) {
                            this.backupNames.set(channel.id, {
                                channelId: channel.id,
                                originalName: channel.name,
                                guildId: channel.guild.id
                            });
                            console.log(`Backed up channel name: ${channel.name} (ID: ${channel.id})`);
                        } else {
                            console.log(`Skipped backing up funny channel name: ${channel.name} (ID: ${channel.id})`);
                        }
                    }
                });
            }
            await this.saveBackup();
            console.log('Channel names backup completed and saved to file');
        } catch (error) {
            console.error('Error backing up channel names:', error);
        }
    }

    private async sendLog(message: string) {
        if (!this.client) return;
        try {
            const channel = await this.client.channels.fetch(this.LOGS_CHANNEL) as TextChannel;
            if (channel?.isTextBased()) {
                await channel.send(message);
            }
        } catch (error) {
            console.error('Error sending log message:', error);
        }
    }

    public async renameChannel(channel: Channel, newName: string, duration: number = 300000) {
        if (!channel.isTextBased() || !(channel instanceof TextChannel)) return false;
        
        if (config.funnyChannelNames.includes(channel.name)) {
            console.log(`Channel ${channel.name} already has a funny name, skipping`);
            await this.sendLog(`⚠️ Le salon \`${channel.name}\` a déjà un nom drôle, ignoré`);
            return false;
        }
        
        const endTime = Date.now() + duration;
        const backupName = this.backupNames.get(channel.id);
        const originalName = backupName?.originalName || channel.name;
        
        this.savedNames.set(channel.id, {
            channelId: channel.id,
            originalName,
            endTime,
            guildId: channel.guild.id
        });

        await channel.setName(newName);
        return true;
    }

    public async restoreChannel(channelId: string): Promise<boolean> {
        const saved = this.savedNames.get(channelId);
        if (!saved || !this.client) return false;

        try {
            const guild = await this.client.guilds.fetch(saved.guildId);
            const channel = await guild.channels.fetch(channelId) as TextChannel;
            if (channel && channel.isTextBased()) {
                if (config.funnyChannelNames.includes(channel.name)) {
                    await channel.setName(saved.originalName);
                    this.savedNames.delete(channelId);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error restoring channel name:', error);
        }
        return false;
    }

    public async restoreAllChannels(sendMessage: boolean = true): Promise<void> {
        if (!this.client) {
            console.log('Client not initialized, skipping channel restoration');
            return;
        }

        console.log('Starting channel restoration...');

        try {
            const channelsToRestore = Array.from(this.savedNames.values())
                .filter(saved => {
                    const channel = this.client?.guilds.cache
                        .get(saved.guildId)?.channels.cache
                        .get(saved.channelId) as TextChannel;
                    return channel && config.funnyChannelNames.includes(channel.name);
                });

            console.log(`Found ${channelsToRestore.length} channels to restore`);

            for (const saved of channelsToRestore) {
                try {
                    await this.restoreChannel(saved.channelId);
                    console.log(`Restored channel ${saved.channelId} to "${saved.originalName}"`);
                    // Attendre 3 secondes entre chaque restauration
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (error) {
                    console.error(`Failed to restore channel ${saved.channelId}:`, error);
                    if (sendMessage) {
                        await this.sendLog(`❌ Échec de la restauration du salon ${saved.channelId}: ${error}`);
                    }
                }
            }

            this.savedNames.clear();
            console.log('All channels restored successfully');
        } catch (error) {
            console.error('Error during channel restoration:', error);
            if (sendMessage) {
                await this.sendLog('❌ Erreur lors de la restauration des salons !');
            }
            throw error;
        }
    }

    public getActiveChannels(): Map<string, SavedChannelName> {
        // Retourner une copie des salons actuellement renommés
        return new Map(this.savedNames);
    }

    private async checkExpiredNames() {
        const now = Date.now();
        const expiredChannels = Array.from(this.savedNames.values())
            .filter(saved => now >= saved.endTime)
            .map(saved => this.restoreChannel(saved.channelId));
        
        await Promise.all(expiredChannels);
    }

    public hasTemporaryName(channelId: string): boolean {
        return this.savedNames.has(channelId);
    }

    public getRemainingTime(channelId: string): number | null {
        const saved = this.savedNames.get(channelId);
        if (!saved) return null;
        const remaining = saved.endTime - Date.now();
        return remaining > 0 ? remaining : null;
    }
}

export const channelNameManager = new ChannelNameManager(); 