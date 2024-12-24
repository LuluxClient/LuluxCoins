import { Client, TextChannel, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Message, ButtonInteraction, TimestampStyles } from 'discord.js';
import { config } from '../config';
import { DoxItem } from '../types/doxTypes';

export class ChristmasManager {
    private client: Client;
    private countdownMessage: Message | null = null;
    private currentDoxIndex: number = -1;
    private revealTimeout: NodeJS.Timeout | null = null;
    private testMode: boolean = false;

    constructor() {
        this.client = null!;
    }

    setClient(client: Client) {
        this.client = client;
    }

    private getRemainingTime(): number {
        if (this.testMode) {
            return 0; // Force countdown completion in test mode
        }
        const christmasDate = new Date(config.vendettaDox.christmasDate);
        const now = new Date();
        return Math.max(0, christmasDate.getTime() - now.getTime());
    }

    private async updateCountdown() {
        try {
            const channel = await this.client.channels.fetch(config.vendettaDox.countdownChannelId) as TextChannel;
            if (!channel) return;

            const remainingTime = this.getRemainingTime();
            const christmasDate = new Date(config.vendettaDox.christmasDate);

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🎄 COUNTDOWN AVANT LE DOX DE VENDETTA 🎄')
                .setDescription(`Le dox sera révélé <t:${Math.floor(christmasDate.getTime() / 1000)}:R>`)
                .setFooter({ text: this.testMode ? 'TEST MODE - Le dox sera révélé à Noël 2024' : 'Le dox sera révélé à Noël 2024' });

            if (remainingTime === 0) {
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('vendetta_dox')
                            .setLabel('VENDETTA DOX')
                            .setStyle(ButtonStyle.Danger)
                    );

                if (!this.countdownMessage) {
                    this.countdownMessage = await channel.send({ embeds: [embed], components: [row] });
                } else {
                    await this.countdownMessage.edit({ embeds: [embed], components: [row] });
                }
            } else {
                if (!this.countdownMessage) {
                    this.countdownMessage = await channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error updating countdown:', error);
        }
    }

    private async revealNextDox(interaction: ButtonInteraction) {
        this.currentDoxIndex++;
        const doxInfo = config.vendettaDox.doxInfo[this.currentDoxIndex];

        if (!doxInfo) {
            const finalEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🎄 DOX COMPLET DE VENDETTA 2024 🎄')
                .setDescription(`Voici le lien complet du dox:\n${config.vendettaDox.finalLink}`);

            await interaction.update({ embeds: [finalEmbed], components: [] });
            this.testMode = false; // Reset test mode after completion
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`🎄 RÉVÉLATION ${this.currentDoxIndex + 1}/${config.vendettaDox.doxInfo.length} 🎄`);

        switch (doxInfo.type) {
            case 'message':
                embed.setDescription(doxInfo.content);
                break;
            case 'image':
                embed.setDescription(doxInfo.title || 'Photo de Vendetta')
                    .setImage(doxInfo.content);
                break;
            case 'link':
                embed.setDescription(`${doxInfo.title || 'Information supplémentaire'}\n\n[Cliquez ici pour voir l'information](${doxInfo.content})`);
                break;
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('next_dox')
                    .setLabel('SUIVANT')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

        await interaction.update({ embeds: [embed], components: [row] });

        // Enable the "SUIVANT" button after 5 seconds
        this.revealTimeout = setTimeout(async () => {
            row.components[0].setDisabled(false);
            await interaction.editReply({ components: [row] });
        }, 5000);
    }

    async handleInteraction(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;

        switch (interaction.customId) {
            case 'vendetta_dox':
            case 'next_dox':
                if (interaction.customId === 'vendetta_dox' && this.currentDoxIndex !== -1) return;
                await this.revealNextDox(interaction);
                break;
        }
    }

    async startCountdown() {
        this.testMode = false;
        this.currentDoxIndex = -1;
        if (this.countdownMessage) {
            try {
                await this.countdownMessage.delete();
            } catch (error) {
                console.error('Error deleting old message:', error);
            }
        }
        this.countdownMessage = null;
        await this.updateCountdown();
    }

    stopCountdown() {
        // Nothing to stop since we're using Discord's timestamp
    }

    async triggerCountdownComplete() {
        this.testMode = true;
        this.currentDoxIndex = -1;
        if (this.countdownMessage) {
            try {
                await this.countdownMessage.delete();
            } catch (error) {
                console.error('Error deleting old message:', error);
            }
        }
        this.countdownMessage = null;
        await this.updateCountdown();
    }

    cleanup() {
        if (this.revealTimeout) {
            clearTimeout(this.revealTimeout);
            this.revealTimeout = null;
        }
        this.testMode = false;
    }
}

// Export a single instance to be used across the application
export const christmasManager = new ChristmasManager(); 