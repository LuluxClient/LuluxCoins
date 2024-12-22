import { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function setup(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    
    if (!channel.isTextBased()) {
        return await interaction.reply({
            content: '❌ Le canal doit être un canal textuel.',
            ephemeral: true
        });
    }

    musicManager.setMusicChannel(channel);
    
    await interaction.reply({
        content: `✅ Canal de musique configuré sur ${channel.name}`,
        ephemeral: true
    });
} 