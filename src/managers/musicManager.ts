import { VoiceConnection, AudioPlayer, createAudioPlayer, AudioPlayerStatus, createAudioResource, StreamType, demuxProbe } from '@discordjs/voice';
import { TextChannel, EmbedBuilder, Client, GatewayIntentBits, VoiceChannel, GuildMember, VoiceBasedChannel } from 'discord.js';
import { QueueItem, MusicState, SkipVoteStatus } from '../types/musicTypes';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import youtubeDl from 'youtube-dl-exec';
import { execSync } from 'child_process';
import { Readable } from 'stream';
import got from 'got';
import { stream as playDlStream } from 'play-dl';

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
    private isPlaying: boolean = false;

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
            console.log('AudioPlayer est devenu Idle');
            if (this.isPlaying) {
                this.isPlaying = false;
                if (this.currentItem) {
                    if (this.loopRemaining > 0) {
                        console.log('Mode répétition actif, répétitions restantes:', this.loopRemaining);
                        this.loopRemaining--;
                        this.playCurrentSong();
                    } else {
                        console.log('Passage à la chanson suivante');
                        this.playNext();
                    }
                }
            }
        });

        this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
            if (!this.isPlaying) {
                console.log('AudioPlayer commence à jouer:', this.currentItem?.title);
                this.isPlaying = true;
                if (this.currentItem) {
                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🎵 Lecture en cours')
                        .setDescription(`[${this.currentItem.title}](${this.currentItem.url})`);
                    this.sendMessage(embed);
                }
            }
        });

        this.audioPlayer.on('error', error => {
            console.error('Erreur AudioPlayer:', error);
            this.sendMessage('❌ Une erreur est survenue pendant la lecture.');
            this.playNext();
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
        console.log('PlayNext appelé. Queue length:', this.queue.length);
        
        if (this.queue.length === 0) {
            console.log('File d\'attente vide');
            this.currentItem = null;
            const embed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('🔇 File d\'attente vide')
                .setDescription('Plus aucune musique dans la file d\'attente')
                .setTimestamp();

            this.sendMessage(embed);
            return;
        }

        this.currentItem = this.queue.shift()!;
        console.log('Nouvelle chanson sélectionnée:', this.currentItem.title);
        this.skipVotes.clear();
        await this.playCurrentSong();
    }

    async playCurrentSong() {
        if (!this.currentItem) {
            console.log('Aucun item à jouer');
            return;
        }
        
        try {
            if (!this.connection || this.connection.state.status === 'destroyed') {
                console.error('Connection perdue - impossible de jouer');
                return;
            }

            console.log('Création du stream pour:', this.currentItem.title);
            
            const stream = await playDlStream(this.currentItem.url, {
                discordPlayerCompatibility: true,
                quality: 2,
                seek: 0
            });

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true,
                silencePaddingFrames: 1,
            });

            if (resource.volume) {
                resource.volume.setVolume(0.5);
            }

            this.audioPlayer.stop();
            this.connection.subscribe(this.audioPlayer);

            this.isPlaying = false;
            this.audioPlayer.play(resource);
            
            console.log('Lecture démarrée avec succès');
            console.log('État de la connexion:', this.connection.state.status);
            console.log('État de l\'AudioPlayer:', this.audioPlayer.state.status);
            console.log('Type de stream:', stream.type);
            console.log('Volume:', resource.volume?.volume);

        } catch (error) {
            console.error('Erreur détaillée:', error);
            this.isPlaying = false;
            this.sendMessage('❌ Erreur de lecture. Passage à la suivante...');
            setTimeout(() => this.playNext(), 1000);
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
        if (this.connection) {
            this.connection.destroy();
        }
        this.connection = connection;
        this.isPlaying = false;
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
        this.isPlaying = false;
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