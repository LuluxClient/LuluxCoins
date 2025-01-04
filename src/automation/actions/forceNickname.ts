import { GuildMember, TextChannel } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import { config } from '../../config';
import { forcedNicknameManager } from '../ForcedNicknameManager';

export const forceNickname: TrollAction = {
    name: 'forceNickname',
    description: 'Force un surnom drôle pendant 4 heures',
    cooldown: 14400000, // 4 heures
    execute: async (target: GuildMember) => {
        console.log('Executing forceNickname for:', target.displayName);
        
        try {
            // Sélectionner un surnom aléatoire
            const nickname = config.forcedNicknames[
                Math.floor(Math.random() * config.forcedNicknames.length)
            ];
            
            console.log('Selected nickname:', nickname);
            
            // Forcer le surnom
            await forcedNicknameManager.forceNickname(target, nickname);
            
            // Envoyer un message dans le salon
            const channel = target.guild.channels.cache
                .find(c => c.isTextBased()) as TextChannel;
            
            if (channel) {
                await channel.send(`🎭 ${target} est maintenant connu sous le nom de "${nickname}" pendant 4 heures ! Toute résistance est futile 😈`);
            }
            
        } catch (error) {
            console.error('Error in forceNickname:', error);
        }
    }
}; 