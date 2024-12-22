import { VoiceConnection, AudioPlayer, createAudioPlayer, AudioPlayerStatus, createAudioResource } from '@discordjs/voice';
import { TextChannel, EmbedBuilder, Client, GatewayIntentBits, VoiceChannel, GuildMember, VoiceBasedChannel } from 'discord.js';
import { QueueItem, MusicState, SkipVoteStatus } from '../types/musicTypes';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import youtubeDl from 'youtube-dl-exec';

export class MusicManager {
    private queue: QueueItem[] = [];
    private currentItem: QueueItem | null = null;
    private connection: VoiceConnection | null = null;
    private audioPlayer: AudioPlayer;
    private loopCount: number = 0;
    private loopRemaining: number = 0;
    private musicChannel: TextChannel | null = null;
    private bannedUsers: Set<string> = new Set();
    private skipVotes: Set<string> = new Set();
    private client: Client | null = null;

    constructor() {
        this.audioPlayer = createAudioPlayer();
        this.setupEventListeners();
        this.loadBannedUsers();
    }

    public setClient(client: Client) {
        this.client = client;
    }

    private async loadBannedUsers() {
        try {
            const filePath = path.join(__dirname, '..', 'data', 'musicBans.json');
            const dataDir = path.join(__dirname, '..', 'data');
            await fs.mkdir(dataDir, { recursive: true });
            
            let bannedArray: string[] = [];
            try {
                const data = await fs.readFile(filePath, 'utf-8');
                bannedArray = JSON.parse(data);
            } catch {
                await fs.writeFile(filePath, '[]');
            }
            
            this.bannedUsers = new Set(bannedArray);
            console.log('[DEBUG] Loaded banned users:', [...this.bannedUsers]);
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs bannis:', error);
            this.bannedUsers = new Set();
        }
    }

    private async saveBannedUsers() {
        try {
            const filePath = path.join(__dirname, '..', 'data', 'musicBans.json');
            const bannedArray = [...this.bannedUsers];
            await fs.writeFile(filePath, JSON.stringify(bannedArray, null, 2));
            console.log('[DEBUG] Saved banned users:', bannedArray);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des utilisateurs bannis:', error);
        }
    }

    setMusicChannel(channel: TextChannel) {
        this.musicChannel = channel;
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Configuration réussie')
            .setDescription(`Canal de musique configuré sur ${channel.name}`)
            .setTimestamp();

        this.sendMessage(embed);
    }

    async banUser(userId: string) {
        console.log(`[DEBUG] Banning user ${userId}`);
        this.bannedUsers.add(userId);
        await this.saveBannedUsers();
        console.log('[DEBUG] Updated banned users:', [...this.bannedUsers]);
    }

    async unbanUser(userId: string) {
        this.bannedUsers.delete(userId);
        await this.saveBannedUsers();
    }

    public isUserBanned(userId: string): boolean {
        const isBanned = this.bannedUsers.has(userId);
        console.log(`[DEBUG] Checking if user ${userId} is banned:`, isBanned);
        console.log('[DEBUG] Current banned users:', [...this.bannedUsers]);
        return isBanned;
    }

    private setupEventListeners() {
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            if (this.loopRemaining > 0) {
                this.loopRemaining--;
                this.playCurrentSong();
            } else {
                this.playNext();
            }
        });

        this.audioPlayer.on('error', error => {
            console.error('Erreur de lecture:', error);
            this.sendMessage('❌ Une erreur est survenue pendant la lecture.');
        });
    }

    private async sendMessage(content: string | EmbedBuilder) {
        if (!this.musicChannel) {
            try {
                const channel = await this.client?.channels.fetch(config.musicChannelId) as TextChannel;
                if (channel?.isTextBased()) {
                    this.musicChannel = channel;
                } else {
                    console.error('Le canal n\'est pas un canal textuel');
                    return;
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du canal:', error);
                return;
            }
        }

        try {
            if (content instanceof EmbedBuilder) {
                await this.musicChannel?.send({ embeds: [content] });
            } else {
                await this.musicChannel?.send({ content });
            }
        } catch (error) {
            console.error('Erreur d\'envoi de message:', error);
        }
    }

    getQueueStatus(): MusicState {
        return {
            currentSong: this.currentItem,
            queue: this.queue,
            loopCount: this.loopCount,
            loopRemaining: this.loopRemaining
        };
    }

    addToQueue(item: QueueItem) {
        this.queue.push(item);
        if (!this.currentItem) {
            this.playNext();
        }
    }

    clearQueue() {
        const queueSize = this.queue.length;
        this.queue = [];
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🗑️ File d\'attente vidée')
            .setDescription(`${queueSize} musiques supprimées`)
            .setTimestamp();

        this.sendMessage(embed);
    }

    setLoop(count: number) {
        this.loopCount = count;
        this.loopRemaining = count;
        const message = count > 0 
            ? `🔄 La musique actuelle sera répétée ${count} fois.`
            : '️ Mode répétition désactivé.';
        this.sendMessage(message);
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.currentItem = null;
            const embed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('🔇 File d\'attente vide')
                .setDescription('Plus aucune musique dans la file d\'attente')
                .setTimestamp();

            if (this.musicChannel) {
                await this.musicChannel.send({ embeds: [embed] });
            }
            return;
        }

        this.currentItem = this.queue.shift()!;
        await this.playCurrentSong();
        this.skipVotes.clear();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎵 Lecture en cours')
            .setDescription(`[${this.currentItem.title}](${this.currentItem.url})`)
            .addFields(
                { name: '⏱️ Durée', value: this.currentItem.duration, inline: true },
                { name: 'Demandé par', value: this.currentItem.requestedBy.username, inline: true }
            )
            .setTimestamp();

        this.sendMessage(embed);
    }

    async playCurrentSong() {
        if (!this.currentItem) return;

        try {
            const output = await youtubeDl(this.currentItem.url, {
                format: 'bestaudio',
                getUrl: true
            });

            const audioUrl = output.toString().trim();
            const resource = createAudioResource(audioUrl);
            this.audioPlayer.play(resource);
        } catch (error) {
            console.error('Erreur de lecture:', error);
            this.sendMessage('❌ Impossible de lire cette musique. Passage  la suivante...');
            this.playNext();
        }
    }

    async initiateSkipVote(userId: string, voiceChannel: VoiceBasedChannel): Promise<SkipVoteStatus> {
        if (this.skipVotes.has(userId)) {
            return this.getSkipVoteStatus(voiceChannel);
        }

        this.skipVotes.add(userId);
        const status = this.getSkipVoteStatus(voiceChannel);

        if (status.current >= status.required) {
            await this.skip();
        }

        return status;
    }

    private getSkipVoteStatus(voiceChannel: VoiceBasedChannel): SkipVoteStatus {
        const membersInChannel = voiceChannel.members.filter(member => !member.user.bot).size;
        const requiredVotes = Math.ceil(membersInChannel * 0.5);
        
        return {
            required: requiredVotes,
            current: this.skipVotes.size,
            voters: Array.from(this.skipVotes)
        };
    }

    async skip() {
        if (!this.currentItem) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Aucune musique en cours de lecture fdp')
                .setTimestamp();

            this.sendMessage(embed);
            return;
        }

        this.audioPlayer.stop();
        await this.playNext();
    }

    setConnection(connection: VoiceConnection) {
        this.connection = connection;
        connection.subscribe(this.audioPlayer);
    }

    disconnect() {
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        this.currentItem = null;
        this.queue = [];
        this.loopCount = 0;
        this.loopRemaining = 0;
        this.skipVotes.clear();
    }

    getCurrentVoiceChannel(): VoiceChannel | null {
        return this.connection?.joinConfig.channelId 
            ? (this.connection.joinConfig as any).channel
            : null;
    }

    public sendChannelMessage(content: string | EmbedBuilder) {
        this.sendMessage(content);
    }
}

export const musicManager = new MusicManager(); 