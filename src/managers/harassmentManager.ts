import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { HarassmentState } from '../types/harassmentTypes';

class HarassmentManager {
    private state: HarassmentState = {
        active: false,
        targetId: null,
        message: null,
        intervalId: null
    };
    private readonly CHANNEL_ID = '1179886753461571644';
    private client: Client | null = null;

    setClient(client: Client) {
        this.client = client;
    }

    async start(targetId: string, message: string) {
        this.stop();

        this.state = {
            active: true,
            targetId,
            message,
            intervalId: setInterval(() => this.sendMessage(), 60000) // Toutes les minutes
        };

        // Envoyer le premier message immédiatement
        await this.sendMessage();
    }

    async stop() {
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
        }
        this.state = {
            active: false,
            targetId: null,
            message: null,
            intervalId: null
        };
    }

    async editMessage(newMessage: string): Promise<boolean> {
        if (!this.state.active) return false;
        this.state.message = newMessage;
        return true;
    }

    private async sendMessage() {
        if (!this.client || !this.state.active || !this.state.targetId || !this.state.message) return;

        const channel = await this.client.channels.fetch(this.CHANNEL_ID) as TextChannel;
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔔 Notification de Harcèlement')
            .setDescription(`<@${this.state.targetId}> ${this.state.message}`)
            .setTimestamp();

        await channel.send({
            content: `<@${this.state.targetId}>`,
            embeds: [embed]
        });
    }
}

export const harassmentManager = new HarassmentManager(); 