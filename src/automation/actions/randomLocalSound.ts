import { GuildMember } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';

const SOUNDS_FOLDER = './sounds';

export const randomLocalSound: TrollAction = {
    name: 'randomLocalSound',
    description: 'Joue un son aléatoire depuis le dossier sounds',
    cooldown: 180000, // 3 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing randomLocalSound for:', target.displayName);
        if (!target.voice.channel) {
            console.log('Target is not in a voice channel');
            return;
        }

        try {
            const files = await readdir(SOUNDS_FOLDER);
            const mp3Files = files.filter(f => f.endsWith('.mp3'));
            console.log('Available sound files:', mp3Files);

            if (mp3Files.length === 0) {
                console.log('No MP3 files found in sounds folder');
                return;
            }

            const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
            console.log('Selected sound file:', randomFile);

            const connection = joinVoiceChannel({
                channelId: target.voice.channel.id,
                guildId: target.guild.id,
                adapterCreator: target.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(join(SOUNDS_FOLDER, randomFile));
            
            connection.subscribe(player);
            player.play(resource);

            player.on('error', error => {
                console.error('Error playing sound:', error);
                connection.destroy();
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('Sound finished playing');
                connection.destroy();
            });

            console.log('Started playing sound');
        } catch (error) {
            console.error('Error in randomLocalSound:', error);
        }
    }
}; 