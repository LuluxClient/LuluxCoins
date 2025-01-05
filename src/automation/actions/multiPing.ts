import { TrollAction } from '../types/AutomationType';
import { trollConfig } from '../config/troll.config';

export const multiPing: TrollAction = {
    name: 'multiPing',
    description: 'Envoie plusieurs pings dans différents salons',
    cooldown: trollConfig.actions.multiPing.cooldown,
    canExecute: async (member) => member.voice.channel !== null,
    execute: async (target) => {
        const guild = target.guild;
        const textChannels = guild.channels.cache.filter(c => c.isTextBased());
        
        for (const channel of textChannels.values()) {
            if (channel.isTextBased()) {
                const msg = await channel.send(`<@${target.id}>`);
                setTimeout(() => msg.delete().catch(() => {}), trollConfig.actions.multiPing.deleteDelay);
            }
        }
    }
}; 