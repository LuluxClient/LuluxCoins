import { GuildMember } from 'discord.js';
import { TrollAction } from '../types/AutomationType';

const DELETE_MESSAGE_DELAY = 100; // 0.1 seconds

export const multiPing: TrollAction = {
    name: 'multiPing',
    description: 'Ping l\'utilisateur dans plusieurs salons',
    cooldown: 600000, // 10 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing multiPing for:', target.displayName);
        const textChannels = target.guild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => c);

        console.log('Available text channels:', textChannels.length);

        for (const channel of textChannels) {
            try {
                console.log('Sending ping in channel:', channel.name);
                const msg = await channel.send(`${target}`);
                setTimeout(() => msg.delete().catch(() => {}), DELETE_MESSAGE_DELAY);
            } catch (error) {
                console.log('Failed to send message in channel:', channel.name, error);
            }
        }
        console.log('MultiPing completed');
    }
}; 