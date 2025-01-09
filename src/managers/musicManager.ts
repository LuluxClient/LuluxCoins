import { VoiceConnection, AudioPlayer, createAudioPlayer, AudioPlayerStatus, createAudioResource, StreamType } from '@discordjs/voice';
import { TextChannel, EmbedBuilder, Client, GatewayIntentBits, VoiceChannel, GuildMember, VoiceBasedChannel } from 'discord.js';
import { QueueItem, MusicState, SkipVoteStatus } from '../types/musicTypes';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import youtubeDl from 'youtube-dl-exec';
import { execSync } from 'child_process';
import { joinVoiceChannel } from '@discordjs/voice';
import { entersState } from '@discordjs/voice';
import { VoiceConnectionStatus } from '@discordjs/voice';

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
                        this.playCurrentSong().catch(console.error);
                    } else {
                        console.log('Passage à la chanson suivante');
                        this.playNext().catch(console.error);
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
                    this.sendMessage(embed).catch(console.error);
                }
            }
        });

        this.audioPlayer.on('error', error => {
            console.error('Erreur AudioPlayer:', error);
            this.sendMessage('❌ Une erreur est survenue pendant la lecture.').catch(console.error);
            this.playNext().catch(console.error);
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

            await this.sendMessage(embed);
            
            // Déconnexion automatique quand la file est vide
            console.log('Déconnexion automatique...');
            this.disconnect();
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
            // Vérifier et recréer la connexion si nécessaire
            if (!this.connection || this.connection.state.status !== VoiceConnectionStatus.Ready) {
                console.error('Connection non disponible ou non prête');
                if (this.client) {
                    const lastChannelId = this.connection?.joinConfig.channelId;
                    if (lastChannelId) {
                        const channel = await this.client.channels.fetch(lastChannelId) as VoiceChannel;
                        if (channel) {
                            const newConnection = joinVoiceChannel({
                                channelId: channel.id,
                                guildId: channel.guild.id,
                                adapterCreator: channel.guild.voiceAdapterCreator,
                                selfDeaf: true
                            });
                            this.setConnection(newConnection);
                            await entersState(newConnection, VoiceConnectionStatus.Ready, 5_000);
                        }
                    }
                }
            }

            if (!this.connection || this.connection.state.status !== VoiceConnectionStatus.Ready) {
                throw new Error('Impossible d\'établir une connexion valide');
            }

            console.log('Création de la ressource audio pour:', this.currentItem.title);
            
            // Télécharger la musique d'abord
            const safeTitle = this.currentItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const soundsPath = path.join(process.cwd(), 'sounds');
            const serverSoundsPath = path.join(soundsPath, 'music');
            await fs.mkdir(serverSoundsPath, { recursive: true });
            
            const filename = path.join(serverSoundsPath, `${safeTitle}.mp3`);
            
            console.log(`[Download] Starting download for "${this.currentItem.title}" from ${this.currentItem.url}`);
            
            await youtubeDl(this.currentItem.url, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
                output: filename,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                cookies: path.join(process.cwd(), 'cookies.txt'),
                addHeader: [
                    'referer:youtube.com',
                    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                ]
            });

            // Créer la ressource audio à partir du fichier téléchargé
            const resource = createAudioResource(filename, {
                inlineVolume: true
            });

            // S'assurer que la connexion est active et subscribe l'audioPlayer
            if (this.connection && this.connection.state.status === VoiceConnectionStatus.Ready) {
                this.connection.subscribe(this.audioPlayer);
                this.audioPlayer.play(resource);

                // Nettoyer le fichier après la lecture
                this.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
                    try {
                        await fs.unlink(filename);
                        console.log(`[Cleanup] Deleted file: ${filename}`);
                    } catch (error) {
                        console.error('[Cleanup] Error deleting file:', error);
                    }
                });
            } else {
                throw new Error('La connexion a été perdue pendant la préparation de la lecture');
            }

        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            await this.sendMessage('❌ Une erreur est survenue pendant la lecture.');
            if (this.queue.length > 0) {
                await this.playNext();
            } else {
                this.disconnect();
            }
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
                .setDescription('Aucune musique en cours de lecture')
                .setTimestamp();

            await this.sendMessage(embed);
            return;
        }

        // Stocker l'état actuel avant le skip
        const wasPlaying = this.isPlaying;
        const currentConnection = this.connection;
        const hasNextSong = this.queue.length > 0;
        const nextSong = hasNextSong ? this.queue[0] : null;

        try {
            // Si on n'a pas de prochaine chanson, on déconnecte
            if (!hasNextSong) {
                this.audioPlayer.stop();
                this.disconnect();
                return;
            }

            // Vérifier la connexion avant de continuer
            if (!currentConnection || currentConnection.state.status !== VoiceConnectionStatus.Ready) {
                if (this.client && currentConnection?.joinConfig.channelId) {
                    const channel = await this.client.channels.fetch(currentConnection.joinConfig.channelId) as VoiceChannel;
                    if (channel) {
                        const newConnection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: channel.guild.id,
                            adapterCreator: channel.guild.voiceAdapterCreator,
                            selfDeaf: true
                        });
                        
                        // Attendre que la connexion soit prête avant de continuer
                        await entersState(newConnection, VoiceConnectionStatus.Ready, 5_000);
                        this.setConnection(newConnection);
                    }
                }
            }

            // Passer à la prochaine chanson
            this.currentItem = this.queue.shift()!;
            
            // Arrêter la lecture actuelle
            this.audioPlayer.stop();
            
            // Jouer la nouvelle chanson
            await this.playCurrentSong();

        } catch (error) {
            console.error('Erreur lors du skip:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors du skip.')
                .setTimestamp();
            await this.sendMessage(embed);
            
            // En cas d'erreur, restaurer l'état précédent si possible
            if (nextSong) {
                this.currentItem = nextSong;
                await this.playCurrentSong();
            } else {
                this.disconnect();
            }
        }
    }

    setConnection(connection: VoiceConnection) {
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.connection.destroy();
        }
        this.connection = connection;
        
        // Ajouter des listeners pour gérer les états de la connexion
        connection.on('stateChange', async (oldState, newState) => {
            console.log(`Connection state changed from ${oldState.status} to ${newState.status}`);
            
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    if (this.connection === connection) {
                        console.error('Impossible de rétablir la connexion:', error);
                        // Ne pas déconnecter si on a encore des chansons dans la queue
                        if (this.queue.length === 0) {
                            this.disconnect();
                        } else {
                            // Tenter de recréer une nouvelle connexion
                            try {
                                const channelId = connection.joinConfig.channelId;
                                if (channelId && this.client) {
                                    const channel = await this.client.channels.fetch(channelId) as VoiceChannel;
                                    if (channel) {
                                        const newConnection = joinVoiceChannel({
                                            channelId: channel.id,
                                            guildId: channel.guild.id,
                                            adapterCreator: channel.guild.voiceAdapterCreator,
                                            selfDeaf: true
                                        });
                                        this.setConnection(newConnection);
                                    }
                                }
                            } catch (reconnectError) {
                                console.error('Impossible de recréer la connexion:', reconnectError);
                            }
                        }
                    }
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                if (this.connection === connection) {
                    this.connection = null;
                }
            }
        });

        // S'assurer que l'audioPlayer est connecté
        connection.subscribe(this.audioPlayer);
    }

    disconnect() {
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.connection.destroy();
        }
        this.connection = null;
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