import { VoiceChannel, GuildMember, TextChannel, Message } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';
import OpenAI from 'openai';
import { randomInt } from 'crypto';
import { config } from '../../config';
import ytdl from 'ytdl-core';
import { forcedNicknameManager } from '../ForcedNicknameManager';
import { channelNameManager } from '../ChannelNameManager';

const SOUNDS_FOLDER = './sounds';
const DELETE_MESSAGE_DELAY = 100; // 0.1 seconds
const openai = new OpenAI({ apiKey: config.openaiApiKey });

async function generateTrollQuestion(): Promise<{ question: string, answer: string, hints: string[] }> {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: 'Génère une question drôle et complexe qui demande réflexion, avec sa réponse et 6 indices. Format: { "question": "...", "answer": "...", "hints": ["indice1", "indice2", "indice3", "indice4", "indice5", "indice6"] }. La question doit être absurde mais avoir du sens.'
            }
        ],
        max_tokens: 300,
        temperature: 0.9,
    });

    try {
        const content = response.choices[0]?.message?.content?.trim() || '';
        const parsed = JSON.parse(content);
        return parsed;
    } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        return {
            question: 'Pourquoi les chats retombent-ils toujours sur leurs pattes, mais les tartines toujours du côté beurré ?',
            answer: 'À cause de la loi de Murphy et de l\'équilibre félin',
            hints: [
                'Pensez aux lois de la physique',
                'Les chats ont un réflexe d\'équilibrage',
                'La tartine suit une loi universelle',
                'Murphy a une loi à ce sujet',
                'L\'un est instinctif, l\'autre est une malédiction',
                'La réponse implique deux concepts différents'
            ]
        };
    }
}

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

export const trollActions: TrollAction[] = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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

                // Envoyer un message dans le premier salon disponible
                // const channel = target.guild.channels.cache
                //     .find(c => c.isTextBased()) as TextChannel;
                
                // if (channel) {
                //     await channel.send(`🎭 Tous les salons ont été renommés pendant 5 minutes ! C'est la foire ! 🎪`);
                // }
                
            } catch (error) {
                console.error('Error in tempChannelNames:', error);
            }
        }
    },
    {
        name: 'discussion',
        description: 'Pose une question complexe et drôle avec un compte à rebours',
        cooldown: 900000, // 15 minutes
        execute: async (target: GuildMember) => {
            console.log('Executing discussion troll for:', target.displayName);
            
            const channel = target.guild.channels.cache.get('1179886753461571644') as TextChannel;
            if (!channel) {
                console.log('Logs channel not found');
                return;
            }

            try {
                const { question, answer, hints } = await generateTrollQuestion();
                console.log('Generated question:', question);
                console.log('Answer:', answer);

                let timeLeft = 60;
                let hintIndex = 0;
                const message = await channel.send({
                    content: `${target}, ${question}\n\nTemps restant: ${timeLeft} secondes ⏰\nProchain indice dans: 10 secondes 💡`
                });

                // Créer un collecteur pour les réponses
                const filter = (m: Message) => m.author.id === target.id;
                const collector = channel.createMessageCollector({ 
                    filter, 
                    time: 60000 // 60 secondes
                });

                // Timer pour les indices (toutes les 10 secondes)
                const hintTimer = setInterval(() => {
                    if (hintIndex < hints.length) {
                        channel.send(`💡 Indice ${hintIndex + 1}: ${hints[hintIndex]}`);
                        hintIndex++;
                    }
                }, 10000);

                // Mettre à jour le compte à rebours
                const timer = setInterval(async () => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        try {
                            await message.edit({
                                content: `${target}, ${question}\n\nTemps restant: ${timeLeft} secondes ⏰\nProchain indice dans: ${10 - (timeLeft % 10)} secondes 💡`
                            });
                        } catch (error) {
                            console.error('Error updating timer:', error);
                        }
                    }
                }, 1000);

                let hasResponded = false;

                collector.on('collect', async (msg) => {
                    // Vérifier si la réponse est correcte (comparaison approximative)
                    const userAnswer = msg.content.toLowerCase();
                    const correctAnswer = answer.toLowerCase();
                    
                    if (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) {
                        hasResponded = true;
                        clearInterval(timer);
                        clearInterval(hintTimer);
                        await channel.send(`🎉 Bravo ${target} ! Tu as trouvé la bonne réponse !`);
                        collector.stop();
                    } else {
                        await channel.send(`❌ Désolé ${target}, ce n'est pas la bonne réponse. Continue d'essayer !`);
                    }
                });

                collector.on('end', async () => {
                    clearInterval(timer);
                    clearInterval(hintTimer);
                    if (!hasResponded) {
                        console.log('No correct response received, executing punishment');
                        
                        await channel.send(`⏰ Temps écoulé ! La réponse était: ${answer}`);
                        
                        // Punition: Multi Ping + Force Rename
                        try {
                            await trollActions.find(a => a.name === 'multiPing')?.execute(target);
                            await trollActions.find(a => a.name === 'forceNickname')?.execute(target);
                        } catch (error) {
                            console.error('Error executing punishment:', error);
                        }
                    }
                });

            } catch (error) {
                console.error('Error in discussion troll:', error);
            }
        }
    },
    {
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
    },
    {
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
    },
    {
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
    }
]; 