import { GuildMember, TextChannel, Message } from 'discord.js';
import { TrollAction } from '../types/AutomationType';
import OpenAI from 'openai';
import { config } from '../../config';
import { trollActions } from './index';

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

export const discussion: TrollAction = {
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
}; 