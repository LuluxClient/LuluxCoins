import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function loop(interaction: ChatInputCommandInteraction) {
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
            content: '❌ Vous devez être dans un salon vocal pour utiliser cette commande.',
            ephemeral: true
        });
    }

    const times = interaction.options.getInteger('times', true);
    musicManager.setLoop(times);

    await interaction.reply({
        content: times === 0 
            ? '➡️ Mode répétition désactivé.'
            : `🔄 La musique actuelle sera répétée ${times} fois.`,
        ephemeral: true
    });
} 