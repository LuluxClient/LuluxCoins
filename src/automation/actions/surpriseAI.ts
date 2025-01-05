import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import OpenAI from 'openai';
import { config } from '../../config';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from '@discordjs/voice';
import { channelNameManager } from '../ChannelNameManager';
import { trollConfig } from '../config/troll.config';

const SOUNDS_FOLDER = './sounds';
const openai = new OpenAI({ apiKey: config.openaiApiKey });

async function generateSurpriseAction(target: GuildMember): Promise<{ action: string, details: any }> {
    const context = {
        inVoice: target.voice.channel ? true : false,
        activity: target.presence?.activities[0]?.name || 'rien',
        username: target.displayName,
        status: target.presence?.status || 'offline'
    };

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: `Tu es un expert en blagues Discord créatives. L'utilisateur ${context.username} est ${context.inVoice ? 'dans un salon vocal' : 'pas dans un salon vocal'}, fait: ${context.activity} et son statut est: ${context.status}.
                Choisis UNE action parmi:
                1. "RENAME_CHANNELS" - Renommer tous les salons textuels avec un thème spécifique (ex: noms de pokémon, plats de fast-food, etc.)
                2. "VOICE_ADVENTURE" - Créer une mini-aventure vocale avec des sons et des déplacements
                3. "MEME_STORY" - Créer une histoire drôle avec des GIFs et des memes
                4. "FAKE_CONVERSATION" - Simuler une conversation absurde avec des réponses préprogrammées
                5. "SOUND_PARTY" - Jouer une séquence de sons drôles avec une narration
                6. "NICKNAME_SAGA" - Changer progressivement le surnom avec une histoire
                
                Réponds avec un JSON contenant:
                - "type": le type d'action choisi
                - "theme": le thème ou concept de l'action
                - "steps": un tableau d'étapes pour l'action
                - "duration": durée suggérée en secondes (max 60)
                
                Sois créatif et adapte l'action au contexte de l'utilisateur !`
            }
        ],
        max_tokens: 500,
        temperature: 0.9,
    });

    try {
        const content = response.choices[0]?.message?.content?.trim() || '';
        return { action: 'MEME_STORY', details: JSON.parse(content) };
    } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        return {
            action: 'MEME_STORY',
            details: {
                type: 'MEME_STORY',
                theme: 'Une journée typique de gamer',
                steps: [
                    'Le réveil difficile',
                    'La pause café ratée',
                    'Le rage quit épique',
                    'La victoire inattendue'
                ],
                duration: 30
            }
        };
    }
}

async function executeVoiceAdventure(target: GuildMember, details: any) {
    if (!target.voice.channel) return;
    
    const availableChannels = target.guild.channels.cache
        .filter(c => c.isVoiceBased())
        .map(c => c.id);
    
    const connection = joinVoiceChannel({
        channelId: target.voice.channel.id,
        guildId: target.guild.id,
        adapterCreator: target.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    for (const step of details.steps) {
        // Déplacer dans un salon aléatoire
        const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
        await target.voice.setChannel(randomChannel);

        // Jouer un son aléatoire
        const files = await readdir(SOUNDS_FOLDER);
        const mp3Files = files.filter(f => f.endsWith('.mp3'));
        const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
        const resource = createAudioResource(join(SOUNDS_FOLDER, randomFile));
        player.play(resource);

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    connection.destroy();
}

async function executeMemeStory(target: GuildMember, details: any) {
    const channel = target.guild.channels.cache.get('1179886753461571644') as TextChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🎭 ${details.theme}`)
        .setDescription(`Une histoire spéciale pour ${target.displayName}`)
        .setColor('#FF69B4');

    const message = await channel.send({ embeds: [embed] });

    for (const step of details.steps) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await channel.send(`${step}\nhttps://tenor.com/search/${encodeURIComponent(step)}`);
    }

    setTimeout(() => {
        message.delete().catch(console.error);
    }, details.duration * 1000);
}

async function executeNicknameSaga(target: GuildMember, details: any) {
    for (const step of details.steps) {
        await target.setNickname(step);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    // Restaurer le surnom original à la fin
    await target.setNickname(null);
}

async function executeRenameChannels(target: GuildMember, details: any) {
    const textChannels = target.guild.channels.cache
        .filter(c => c.isTextBased())
        .map(c => c as TextChannel);

    for (const channel of textChannels) {
        const newName = details.steps[Math.floor(Math.random() * details.steps.length)];
        await channelNameManager.renameChannel(channel, newName);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function executeSoundParty(target: GuildMember, details: any) {
    if (!target.voice.channel) return;

    const connection = joinVoiceChannel({
        channelId: target.voice.channel.id,
        guildId: target.guild.id,
        adapterCreator: target.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const files = await readdir(SOUNDS_FOLDER);
    const mp3Files = files.filter(f => f.endsWith('.mp3'));

    for (const step of details.steps) {
        const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
        const resource = createAudioResource(join(SOUNDS_FOLDER, randomFile));
        player.play(resource);
        await new Promise(resolve => setTimeout(resolve, 4000));
    }

    connection.destroy();
}

async function executeFakeConversation(target: GuildMember, details: any) {
    const channel = target.guild.channels.cache.get('1179886753461571644') as TextChannel;
    if (!channel) return;

    const webhook = await channel.createWebhook({
        name: 'Assistant Drôle',
        avatar: 'https://i.imgur.com/AfFp7pu.png'
    });

    try {
        for (const step of details.steps) {
            await webhook.send(step);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } finally {
        await webhook.delete();
    }
}

export const surpriseAI: TrollAction = {
    name: 'surpriseAI',
    description: 'Fait parler le bot de manière surprenante',
    cooldown: trollConfig.actions.surpriseAI.cooldown,
    canExecute: async (member) => member.voice.channel !== null,
    execute: async (target) => {
        console.log('Executing surpriseAI for:', target.displayName);
        
        try {
            const { action, details } = await generateSurpriseAction(target);
            console.log('AI suggested action:', action, details);
            
            switch (details.type) {
                case 'VOICE_ADVENTURE':
                    await executeVoiceAdventure(target, details);
                    break;
                case 'MEME_STORY':
                    await executeMemeStory(target, details);
                    break;
                case 'NICKNAME_SAGA':
                    await executeNicknameSaga(target, details);
                    break;
                case 'RENAME_CHANNELS':
                    await executeRenameChannels(target, details);
                    break;
                case 'SOUND_PARTY':
                    await executeSoundParty(target, details);
                    break;
                case 'FAKE_CONVERSATION':
                    await executeFakeConversation(target, details);
                    break;
                default:
                    await executeMemeStory(target, details);
            }
            
        } catch (error) {
            console.error('Error in surpriseAI:', error);
        }
    }
}; 