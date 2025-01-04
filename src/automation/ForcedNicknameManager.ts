import { GuildMember, Client } from 'discord.js';
import { config } from '../config';

interface ForcedNickname {
    userId: string;
    nickname: string;
    endTime: number;
    lastMessageTime?: number;
    guildId: string;
}

class ForcedNicknameManager {
    private forcedNicknames: Map<string, ForcedNickname> = new Map();
    private readonly MESSAGE_COOLDOWN = 60000; // 1 minute entre chaque message
    private checkInterval: NodeJS.Timeout;
    private client: Client | null = null;

    constructor() {
        // Vérifier toutes les minutes si des surnoms ont expiré
        this.checkInterval = setInterval(() => this.cleanupExpiredNicknames(), 60000);
    }

    public setClient(client: Client) {
        this.client = client;
    }

    private async cleanupExpiredNicknames() {
        const now = Date.now();
        const expiredUsers = Array.from(this.forcedNicknames.entries())
            .filter(([, forced]) => now >= forced.endTime);

        for (const [userId, forced] of expiredUsers) {
            try {
                // Notifier dans le salon de logs
                const guild = await this.getGuild(forced.guildId);
                if (guild) {
                    const member = await guild.members.fetch(userId);
                    if (member && member.nickname === forced.nickname) {
                        await member.setNickname(null);
                        const channel = guild.channels.cache.get('1179886753461571644');
                        if (channel?.isTextBased()) {
                            await channel.send(`✅ Le surnom forcé de ${member.user.username} a expiré et a été retiré.`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error cleaning up nickname for user ${userId}:`, error);
            } finally {
                // Toujours supprimer de la RAM, même en cas d'erreur
                this.forcedNicknames.delete(userId);
            }
        }
    }

    private async getGuild(guildId: string) {
        try {
            return await this.client?.guilds.fetch(guildId);
        } catch (error) {
            console.error(`Error fetching guild ${guildId}:`, error);
            return null;
        }
    }

    public async forceNickname(member: GuildMember, nickname?: string, duration: number = 14400000): Promise<void> { // 4 heures par défaut
        const selectedNickname = nickname || config.forcedNicknames[Math.floor(Math.random() * config.forcedNicknames.length)];
        
        // Sauvegarder dans la RAM
        this.forcedNicknames.set(member.id, {
            userId: member.id,
            nickname: selectedNickname,
            endTime: Date.now() + duration,
            guildId: member.guild.id
        });

        try {
            await member.setNickname(selectedNickname);
            const channel = member.guild.channels.cache.get('1179886753461571644');
            if (channel?.isTextBased()) {
                await channel.send(`😈 ${member.user.username} a reçu le surnom forcé "${selectedNickname}" pendant ${duration/3600000} heures !`);
            }
        } catch (error) {
            console.error(`Error forcing nickname for user ${member.id}:`, error);
            this.forcedNicknames.delete(member.id);
            throw error;
        }
    }

    public isForced(userId: string): boolean {
        const forced = this.forcedNicknames.get(userId);
        if (!forced) return false;
        
        if (Date.now() >= forced.endTime) {
            this.forcedNicknames.delete(userId);
            return false;
        }
        
        return true;
    }

    public async checkAndReset(member: GuildMember): Promise<void> {
        const forced = this.forcedNicknames.get(member.id);
        if (!forced || Date.now() >= forced.endTime) {
            this.forcedNicknames.delete(member.id);
            return;
        }

        // Si le surnom actuel est différent du surnom forcé
        if (member.nickname !== forced.nickname) {
            try {
                await member.setNickname(forced.nickname);
                
                // Vérifier le cooldown des messages
                const now = Date.now();
                if (!forced.lastMessageTime || now - forced.lastMessageTime >= this.MESSAGE_COOLDOWN) {
                    const channel = member.guild.channels.cache.get('1179886753461571644');
                    if (channel?.isTextBased()) {
                        await channel.send(`😈 ${member.user.username} a tenté de changer son surnom forcé ! (${Math.ceil((forced.endTime - now) / 60000)} minutes restantes)`);
                    }
                    // Mettre à jour le timestamp du dernier message
                    forced.lastMessageTime = now;
                    this.forcedNicknames.set(member.id, forced);
                }
            } catch (error) {
                console.error(`Error resetting nickname for user ${member.id}:`, error);
            }
        }
    }

    public getRemainingTime(userId: string): number | null {
        const forced = this.forcedNicknames.get(userId);
        if (!forced) return null;
        
        const remaining = forced.endTime - Date.now();
        if (remaining <= 0) {
            this.forcedNicknames.delete(userId);
            return null;
        }
        
        return remaining;
    }

    public getForcedNickname(userId: string): string | null {
        const forced = this.forcedNicknames.get(userId);
        if (!forced || Date.now() >= forced.endTime) {
            this.forcedNicknames.delete(userId);
            return null;
        }
        return forced.nickname;
    }

    public getActiveForcedNicknames(): Map<string, ForcedNickname> {
        // Nettoyer et retourner une copie des surnoms actifs
        const now = Date.now();
        const activeNicknames = new Map();
        
        for (const [userId, forced] of this.forcedNicknames.entries()) {
            if (now < forced.endTime) {
                activeNicknames.set(userId, {...forced});
            } else {
                this.forcedNicknames.delete(userId);
            }
        }
        
        return activeNicknames;
    }
}

export const forcedNicknameManager = new ForcedNicknameManager(); 