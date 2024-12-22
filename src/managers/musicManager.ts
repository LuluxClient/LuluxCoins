import { VoiceConnection, AudioPlayer, createAudioPlayer, AudioPlayerStatus, createAudioResource } from '@discordjs/voice';
import { TextChannel, EmbedBuilder, Client, GatewayIntentBits, VoiceChannel, GuildMember, VoiceBasedChannel } from 'discord.js';
import { QueueItem, MusicState, SkipVoteStatus } from '../types/musicTypes';
import youtubeDl from 'youtube-dl-exec';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

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

    constructor() {
        this.audioPlayer = createAudioPlayer();
        this.setupEventListeners();
        this.loadBannedUsers();
    }

    private async loadBannedUsers() {
        try {
            const filePath = path.join(__dirname, '..', 'data', 'musicBans.json');
            const data = await fs.readFile(filePath, 'utf-8');
            this.bannedUsers = new Set(JSON.parse(data));
        } catch {
            this.bannedUsers = new Set();
        }
    }

    private async saveBannedUsers() {
        const filePath = path.join(__dirname, '..', 'data', 'musicBans.json');
        await fs.writeFile(filePath, JSON.stringify([...this.bannedUsers]));
    }

    setMusicChannel(channel: TextChannel) {
        this.musicChannel = channel;
    }

    async banUser(userId: string) {
        this.bannedUsers.add(userId);
        await this.saveBannedUsers();
    }

    async unbanUser(userId: string) {
        this.bannedUsers.delete(userId);
        await this.saveBannedUsers();
    }

    isUserBanned(userId: string): boolean {
        return this.bannedUsers.has(userId);
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
                const channel = await client.channels.fetch(config.musicChannelId) as TextChannel;
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
                await this.musicChannel?.send(content);
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
        this.queue = [];
        this.sendMessage('🗑️ La file d\'attente a été vidée.');
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
            this.sendMessage('🎵 La file d\'attente est vide.');
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
                { name: '👤 Demandé par', value: this.currentItem.requestedBy.username, inline: true }
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
            this.sendMessage('❌ Aucune musique en cours de lecture.');
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
}

export const musicManager = new MusicManager(); 