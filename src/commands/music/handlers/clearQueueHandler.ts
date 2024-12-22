import { ChatInputCommandInteraction } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function clearQueue(interaction: ChatInputCommandInteraction) {
    const currentQueue = musicManager.getQueueStatus().queue;
    
    if (currentQueue.length === 0) {
        return await interaction.reply({
            content: '❌ La file d\'attente est déjà vide.',
            ephemeral: true
        });
    }

    musicManager.clearQueue();
    await interaction.reply({
        content: `🗑️ File d\'attente vidée (${currentQueue.length} musiques supprimées).`,
        ephemeral: true
    });
} 