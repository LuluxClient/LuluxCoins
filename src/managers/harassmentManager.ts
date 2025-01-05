import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { HarassmentState, HarassmentDatabase } from '../types/harassmentTypes';
import fs from 'fs/promises';
import path from 'path';

class HarassmentManager {
    private state: HarassmentState = {
        active: false,
        targetId: null,
        message: null,
        intervalId: null,
        startTime: null
    };
    private readonly CHANNEL_ID = '1179886753461571644';
    private readonly MAX_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
    private client: Client | null = null;
    private dbPath: string;

    constructor() {
        this.dbPath = path.join(__dirname, '..', 'database', 'harassment.json');
    }

    async init() {
        try {
            await this.loadState();
            if (this.state.active && this.state.startTime) {
                const elapsedTime = Date.now() - this.state.startTime;
                if (elapsedTime < this.MAX_DURATION) {
                    // Redémarrer le harcèlement avec le temps restant
                    const remainingTime = this.MAX_DURATION - elapsedTime;
                    // Attendre un peu avant de redémarrer pour éviter le spam au redémarrage
                    setTimeout(() => {
                        this.startWithTimeout(this.state.targetId!, this.state.message!, remainingTime);
                    }, 5000);
                } else {
                    // Si plus de 24h sont passées, arrêter le harcèlement
                    await this.stop();
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du harassment manager:', error);
        }
    }

    private async loadState() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf-8');
            const dbData: HarassmentDatabase = JSON.parse(data);
            if (dbData.activeHarassment) {
                this.state = {
                    ...dbData.activeHarassment,
                    intervalId: null
                };
            }
        } catch {
            await this.saveState();
        }
    }

    private async saveState() {
        const dbData: HarassmentDatabase = {
            activeHarassment: this.state.active ? {
                active: this.state.active,
                targetId: this.state.targetId,
                message: this.state.message,
                startTime: this.state.startTime
            } : null
        };
        await fs.writeFile(this.dbPath, JSON.stringify(dbData, null, 2));
    }

    setClient(client: Client) {
        this.client = client;
    }

    private startWithTimeout(targetId: string, message: string, duration: number) {
        // Nettoyer l'ancien intervalle si existant
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
        }

        const startTime = Date.now();
        this.state = {
            active: true,
            targetId,
            message,
            startTime,
            intervalId: setInterval(() => {
                // Vérifier si on a dépassé la durée maximale
                if (Date.now() - startTime >= duration) {
                    this.stop();
                    return;
                }
                this.sendMessage();
            }, 3600000)
        };

        // Programmer l'arrêt automatique
        setTimeout(() => this.stop(), duration);

        // Sauvegarder l'état
        this.saveState();
    }

    async start(targetId: string, message: string) {
        await this.stop();
        this.startWithTimeout(targetId, message, this.MAX_DURATION);
        await this.sendMessage(); // Premier message immédiat
    }

    async stop() {
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
        }

        // Envoyer un message de fin si c'était un arrêt après 24h
        if (this.state.active && this.state.startTime && Date.now() - this.state.startTime >= this.MAX_DURATION) {
            const channel = await this.client?.channels.fetch(this.CHANNEL_ID) as TextChannel;
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔔 Fin du rouxcèlement 🔔')
                    .setDescription(
                        `<@${this.state.targetId}> Le rouxcèlement est terminé après 24h!\n` +
                        `<@252454259252002826> Ton rouxcèlement est terminé.`
                    )
                    .setTimestamp();

                await channel.send({
                    content: `<@${this.state.targetId}> <@252454259252002826>`,
                    embeds: [embed]
                });
            }
        }

        this.state = {
            active: false,
            targetId: null,
            message: null,
            intervalId: null,
            startTime: null
        };
        await this.saveState();
    }

    async editMessage(newMessage: string): Promise<boolean> {
        if (!this.state.active) return false;
        this.state.message = newMessage;
        await this.saveState();
        return true;
    }

    private async sendMessage() {
        if (!this.client || !this.state.active || !this.state.targetId || !this.state.message) return;

        try {
            // Récupérer l'utilisateur cible
            const targetUser = await this.client.users.fetch(this.state.targetId);
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔔 rouxcèlement 🔔')
                .setDescription(`${this.state.message}`)
                .setTimestamp();

            // Tenter d'envoyer le DM
            await targetUser.send({
                embeds: [embed]
            });
        } catch (error) {
            // En cas d'erreur (DMs fermés ou bot bloqué)
            const channel = await this.client.channels.fetch(this.CHANNEL_ID) as TextChannel;
            if (channel) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erreur de rouxcèlement')
                    .setDescription(
                        `Impossible d'envoyer un message privé à <@${this.state.targetId}>.\n` +
                        `Raison possible: DMs fermés ou bot bloqué.\n` +
                        `Le rouxcèlement a été arrêté.`
                    )
                    .setTimestamp();

                await channel.send({
                    content: `<@252454259252002826>`,
                    embeds: [errorEmbed]
                });
            }

            // Arrêter le harcèlement
            await this.stop();
        }
    }
}

export const harassmentManager = new HarassmentManager(); 