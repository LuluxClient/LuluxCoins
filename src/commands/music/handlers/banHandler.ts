import { ChatInputCommandInteraction } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function ban(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    
    if (musicManager.isUserBanned(targetUser.id)) {
        return await interaction.reply({
            content: '❌ Cet utilisateur est déjà banni des commandes de musique.',
            ephemeral: true
        });
    }

    await musicManager.banUser(targetUser.id);
    await interaction.reply({
        content: `🚫 **${targetUser.username}** a été banni des commandes de musique.`,
        ephemeral: true
    });
} 