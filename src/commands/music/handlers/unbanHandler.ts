import { ChatInputCommandInteraction } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function unban(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    
    if (!musicManager.isUserBanned(targetUser.id)) {
        return await interaction.reply({
            content: '❌ Cet utilisateur n\'est pas banni des commandes de musique.',
            ephemeral: true
        });
    }

    await musicManager.unbanUser(targetUser.id);
    await interaction.reply({
        content: `✅ **${targetUser.username}** a été débanni des commandes de musique.`,
        ephemeral: true
    });
} 