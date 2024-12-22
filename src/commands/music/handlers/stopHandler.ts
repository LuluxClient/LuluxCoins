import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function stop(interaction: ChatInputCommandInteraction) {
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
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return await interaction.reply({
            content: '❌ Vous devez être dans un salon vocal pour arrêter la musique.',
            ephemeral: true
        });
    }

    musicManager.clearQueue();
    musicManager.disconnect();
    await interaction.reply({
        content: '⏹️ Lecture arrêtée et file d\'attente vidée.',
        ephemeral: true
    });
} 