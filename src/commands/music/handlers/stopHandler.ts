import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function stop(interaction: ChatInputCommandInteraction) {
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