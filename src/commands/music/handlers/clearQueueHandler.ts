import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function clearQueue(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    
    // Vérification du rôle staff
    if (!member.roles.cache.some(role => role.name.toLowerCase() === 'staff')) {
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