import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { isStaff } from '../../../utils/permissions';

export async function clearQueue(interaction: ChatInputCommandInteraction) {
    // Vérification si l'utilisateur est banni
    if (musicManager.isUserBanned(interaction.user.id)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Accès refusé')
            .setDescription('Tu es banni des commandes de musique.')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    const member = interaction.member as GuildMember;
    
    // Vérification du rôle staff
    if (!isStaff(member)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Accès refusé')
            .setDescription('Nique ta mère')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

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