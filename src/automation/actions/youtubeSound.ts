import { GuildMember } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import OpenAI from 'openai';
import { config } from '../../config';
import ytdl from 'ytdl-core';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

async function generateTrollSound(): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: 'Tu es un expert en sons drôles sur YouTube. Suggère un son court (max 10 secondes) qui serait hilarant à jouer. Sois créatif ! Le son doit être un meme connu ou un effet sonore classique. Réponds uniquement avec le lien YouTube.'
            }
        ],
        max_tokens: 50,
        temperature: 0.9,
    });
    
    // Sons par défaut si OpenAI ne trouve pas de lien valide
    const defaultSounds = [
        'https://www.youtube.com/watch?v=2ZIpFytCSVc', // Bruh
        'https://www.youtube.com/watch?v=_3PUu88nOcw', // Windows XP Error
        'https://www.youtube.com/watch?v=CQeezCdF4mk', // Noot Noot
        'https://www.youtube.com/watch?v=3w-2gUSus34', // Mario Death
        'https://www.youtube.com/watch?v=0lhhrUuw2N8'  // Minecraft Oof
    ];

    const videoUrl = response.choices[0]?.message?.content?.trim();
    
    // Vérifie si le lien est un lien YouTube valide
    if (videoUrl && videoUrl.includes('youtube.com/watch?v=')) {
        return videoUrl;
    }
    
    return defaultSounds[Math.floor(Math.random() * defaultSounds.length)];
}

export const youtubeSound: TrollAction = {
    name: 'youtubeSound',
    description: 'Joue un son drôle choisi par l\'IA',
    cooldown: 300000, // 5 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing youtubeSound for:', target.displayName);
        if (!target.voice.channel) {
            console.log('Target is not in a voice channel');
            return;
        }

        try {
            const videoUrl = await generateTrollSound();
            console.log('Selected video URL:', videoUrl);

            const connection = joinVoiceChannel({
                channelId: target.voice.channel.id,
                guildId: target.guild.id,
                adapterCreator: target.guild.voiceAdapterCreator,
            });

            const stream = ytdl(videoUrl, {
                filter: 'audioonly',
                quality: 'lowestaudio',
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        Cookie: process.env.YOUTUBE_COOKIE || ''
                    }
                }
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(stream);
            
            connection.subscribe(player);
            player.play(resource);

            player.on('error', error => {
                console.error('Error playing YouTube sound:', error);
                connection.destroy();
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('YouTube sound finished playing');
                connection.destroy();
            });

            console.log('Started playing YouTube sound');
        } catch (error) {
            console.error('Error in youtubeSound:', error);
        }
    }
}; 