import { VoiceChannel, GuildMember, TextChannel } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import { join } from 'path';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';

const SOUNDS_FOLDER = './sounds';

export const channelRoulette: TrollAction = {
    name: 'channelRoulette',
    description: 'Déplace l\'utilisateur dans un salon vocal aléatoire',
    cooldown: 300000, // 5 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing channelRoulette for:', target.displayName);
        if (!target.voice.channel) {
            console.log('Target is not in a voice channel');
            return;
        }
        
        const initialChannel = target.voice.channel;
        const availableChannels = target.guild.channels.cache
            .filter(c => c.isVoiceBased() && c.id !== target.voice.channel?.id)
            .map(c => c as VoiceChannel);

        console.log('Available channels:', availableChannels.map(c => c.name));

        if (availableChannels.length === 0) {
            console.log('No available channels to move to');
            return;
        }

        const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
        console.log('Moving to channel:', randomChannel.name);
        
        try {
            // Déplacer l'utilisateur
            await target.voice.setChannel(randomChannel);
            
            // Jouer le son "prout"
            const connection = joinVoiceChannel({
                channelId: randomChannel.id,
                guildId: target.guild.id,
                adapterCreator: target.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(join(SOUNDS_FOLDER, 'prout.mp3'));
            
            connection.subscribe(player);
            player.play(resource);

            // Attendre 6 secondes puis vérifier et remettre dans le salon initial
            setTimeout(async () => {
                try {
                    // Vérifier si l'utilisateur est toujours dans le salon aléatoire
                    const currentMember = await target.guild.members.fetch(target.id);
                    if (currentMember.voice.channelId === randomChannel.id) {
                        await currentMember.voice.setChannel(initialChannel);
                        console.log('Moved user back to initial channel');
                    } else {
                        console.log('User already moved to another channel');
                    }
                } catch (error) {
                    console.error('Error moving user back:', error);
                } finally {
                    // Déconnecter le bot dans tous les cas
                    connection.destroy();
                }
            }, 6000);

            await target.send('Tu t\'es fait avoir ! 🎉');
            console.log('Channel roulette completed');
        } catch (error) {
            console.error('Error in channelRoulette:', error);
        }
    }
}; 