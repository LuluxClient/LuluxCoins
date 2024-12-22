import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function loop(interaction: ChatInputCommandInteraction) {
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