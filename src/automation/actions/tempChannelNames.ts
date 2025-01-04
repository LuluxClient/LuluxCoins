import { GuildMember, TextChannel } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import { config } from '../../config';
import { channelNameManager } from '../ChannelNameManager';

export const tempChannelNames: TrollAction = {
    name: 'tempChannelNames',
    description: 'Renomme temporairement les salons avec des noms drôles',
    cooldown: 900000, // 15 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing tempChannelNames');
        
        try {
            const textChannels = target.guild.channels.cache
                .filter(c => c.isTextBased())
                .map(c => c as TextChannel);

            console.log('Available text channels:', textChannels.length);

            // Renommer tous les salons textuels
            for (const channel of textChannels) {
                // Sélectionner un nom aléatoire différent du nom actuel
                let newName;
                do {
                    newName = config.funnyChannelNames[
                        Math.floor(Math.random() * config.funnyChannelNames.length)
                    ];
                } while (newName === channel.name);
                
                await channelNameManager.renameChannel(channel, newName);
                console.log(`Renamed channel ${channel.name} to ${newName}`);
                
                // Petit délai entre chaque renommage pour éviter le rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error in tempChannelNames:', error);
        }
    }
}; 