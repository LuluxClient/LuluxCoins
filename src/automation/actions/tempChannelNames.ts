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
                .filter(c => c.isTextBased() && !config.funnyChannelNames.includes(c.name))
                .map(c => c as TextChannel);

            console.log('Available text channels to rename:', textChannels.length);

            // Créer une copie du tableau des noms drôles
            let availableNames = [...config.funnyChannelNames];

            // Renommer tous les salons textuels
            for (const channel of textChannels) {
                if (availableNames.length === 0) {
                    console.log('No more available names, refilling the list');
                    availableNames = [...config.funnyChannelNames];
                }

                // Sélectionner un nom aléatoire de la liste disponible
                const randomIndex = Math.floor(Math.random() * availableNames.length);
                const newName = availableNames[randomIndex];
                
                // Retirer le nom utilisé de la liste disponible
                availableNames.splice(randomIndex, 1);
                
                console.log(`Attempting to rename channel ${channel.name} to ${newName}`);
                const success = await channelNameManager.renameChannel(channel, newName);
                console.log(`Rename attempt for ${channel.name} to ${newName}: ${success ? 'success' : 'failed'}`);
                
                // Petit délai entre chaque renommage pour éviter le rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error in tempChannelNames:', error);
        }
    }
}; 