import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function ban(interaction: ChatInputCommandInteraction) {
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