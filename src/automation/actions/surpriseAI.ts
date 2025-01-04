import { GuildMember, TextChannel } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import OpenAI from 'openai';
import { config } from '../../config';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';

const SOUNDS_FOLDER = './sounds';
const openai = new OpenAI({ apiKey: config.openaiApiKey });

async function generateSurpriseAction(target: GuildMember): Promise<string> {
    const context = {
        inVoice: target.voice.channel ? true : false,
        activity: target.presence?.activities[0]?.name || 'rien',
        username: target.displayName
    };

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: `Tu es un expert en blagues Discord. L'utilisateur ${context.username} est ${context.inVoice ? 'dans un salon vocal' : 'pas dans un salon vocal'} et fait: ${context.activity}. 
                Suggère UNE action drôle et inoffensive parmi :
                - Changer son surnom en "X" (remplace X par quelque chose de drôle lié à son activité)
                - Envoyer un GIF drôle
                - Jouer un son aléatoire (s'il est en vocal)
                
                Réponds avec UNE SEULE action qui commence par un verbe comme "Changer", "Envoyer", "Jouer", etc.`
            }
        ],
        max_tokens: 100,
        temperature: 0.9,
    });

    return response.choices[0]?.message?.content?.trim() || 'Envoyer un GIF de danse à l\'utilisateur';
}

async function executeAISuggestion(action: string, target: GuildMember) {
    console.log('Executing AI suggestion:', action);
    const actionLower = action.toLowerCase();

    // Changer le surnom
    if (actionLower.includes('changer') && (actionLower.includes('surnom') || actionLower.includes('pseudo'))) {
        const nickname = action.match(/["']([^"']+)["']/)?.[1] || 
                        action.split('en ').pop()?.split(' dans')[0];
        if (nickname) {
            await target.setNickname(nickname);
            return true;
        }
    }

    // Envoyer un message/GIF
    if (actionLower.includes('envoyer') || actionLower.includes('afficher')) {
        const channel = target.guild.channels.cache
            .find(c => c.isTextBased()) as TextChannel;
        if (channel) {
            if (actionLower.includes('gif')) {
                await channel.send(`https://tenor.com/search/${encodeURIComponent('funny dance')}`);
            } else {
                await channel.send(action.split('envoyer ').pop() || action);
            }
            return true;
        }
    }

    // Jouer un son
    if (actionLower.includes('jouer') && actionLower.includes('son')) {
        if (target.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: target.voice.channel.id,
                guildId: target.guild.id,
                adapterCreator: target.guild.voiceAdapterCreator,
            });

            const files = await readdir(SOUNDS_FOLDER);
            const mp3Files = files.filter(f => f.endsWith('.mp3'));
            if (mp3Files.length > 0) {
                const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
                const player = createAudioPlayer();
                const resource = createAudioResource(join(SOUNDS_FOLDER, randomFile));
                
                connection.subscribe(player);
                player.play(resource);

                player.on(AudioPlayerStatus.Idle, () => {
                    connection.destroy();
                });
                return true;
            }
        }
    }

    return false;
}

export const surpriseAI: TrollAction = {
    name: 'surpriseAI',
    description: 'Laisse l\'IA inventer une action drôle',
    cooldown: 300000, // 5 minutes
    execute: async (target: GuildMember) => {
        console.log('Executing surpriseAI for:', target.displayName);
        
        try {
            const action = await generateSurpriseAction(target);
            console.log('AI suggested action:', action);
            
            const success = await executeAISuggestion(action, target);
            
            // Si l'action n'a pas pu être exécutée, on l'affiche simplement
            if (!success) {
                const channel = target.guild.channels.cache
                    .find(c => c.isTextBased()) as TextChannel;
                
                if (channel) {
                    await channel.send(`🎭 ${action}`);
                }
            }
            
        } catch (error) {
            console.error('Error in surpriseAI:', error);
        }
    }
}; 