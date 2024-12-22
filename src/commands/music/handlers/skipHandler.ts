import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function skip(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return await interaction.reply({
            content: '❌ Vous devez être dans un salon vocal pour voter le passage.',
            ephemeral: true
        });
    }

    const status = await musicManager.initiateSkipVote(interaction.user.id, voiceChannel);
    
    if (status.current >= status.required) {
        await interaction.reply('⏭️ Vote réussi ! Passage à la musique suivante...');
    } else {
        await interaction.reply(
            `🗳️ Vote pour passer la musique: ${status.current}/${status.required} votes requis.`
        );
    }
} 