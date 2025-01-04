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
                content: `Tu es un expert en énigmes et questions pièges.
                Génère une question complexe et drôle qui demande réflexion, avec sa réponse et 3 indices très pertinents.
                La question doit être absurde mais avoir une logique, et les indices doivent vraiment aider à trouver la réponse.
                Les indices doivent être progressifs : le premier donne une piste générale, le deuxième précise la direction, le troisième donne presque la réponse.
                Format: { "question": "...", "answer": "...", "hints": ["indice1", "indice2", "indice3"] }.
                Exemple de question: "Si un arbre tombe dans la forêt et que personne n'est là pour l'entendre, est-ce que le bruit fait 'timber' ou 'boom' ?"
                Exemple de réponse: "Aucun des deux, car le son nécessite un observateur pour être interprété"
                Exemple d'indices: ["Pensez à la nature du son", "Le son est une perception du cerveau", "Sans oreilles pour l'entendre, il n'y a que des ondes"]`
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
            question: 'Si un poulet et demi pond un œuf et demi en un jour et demi, combien d\'œufs pondra un poulet en un jour ?',
            answer: 'Un œuf, car un poulet ne peut pas être divisé en deux et continuer à pondre',
            hints: [
                'Réfléchissez à la logique plutôt qu\'aux mathématiques',
                'Un poulet est un être vivant, pas une fraction',
                'La capacité de ponte d\'un poulet ne dépend pas des mathématiques'
            ]
        };
    }
}

async function checkAnswer(userAnswer: string, correctAnswer: string): Promise<{ isCorrect: boolean, explanation: string }> {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: `Tu es un juge qui évalue si une réponse est correcte ou s'en approche.
                La réponse de l'utilisateur doit soit être exacte, soit capturer l'essence de la bonne réponse.
                Réponds uniquement avec un JSON contenant "isCorrect" (boolean) et "explanation" (string courte).`
            },
            {
                role: 'user',
                content: `Bonne réponse: "${correctAnswer}"
                Réponse de l'utilisateur: "${userAnswer}"`
            }
        ],
        max_tokens: 100,
        temperature: 0.3,
    });

    try {
        const content = response.choices[0]?.message?.content?.trim() || '';
        return JSON.parse(content);
    } catch (error) {
        console.error('Error parsing OpenAI answer check:', error);
        return {
            isCorrect: userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()),
            explanation: 'Réponse évaluée par correspondance simple'
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
            let nextHintIn = 20; // 20 secondes entre chaque indice
            
            const message = await channel.send({
                content: `${target}, ${question}\n\n⏰ Temps restant: ${timeLeft} secondes\n💡 Prochain indice dans: ${nextHintIn} secondes`
            });

            // Créer un collecteur pour les réponses
            const filter = (m: Message) => m.author.id === target.id;
            const collector = channel.createMessageCollector({ 
                filter, 
                time: 60000 // 60 secondes
            });

            const sentMessages: Message[] = [message];

            // Timer pour les indices (toutes les 20 secondes)
            const hintTimer = setInterval(async () => {
                if (hintIndex < hints.length) {
                    const hintMsg = await channel.send(`💡 Indice ${hintIndex + 1}: ${hints[hintIndex]}`);
                    sentMessages.push(hintMsg);
                    hintIndex++;
                    nextHintIn = 20;
                }
            }, 20000);

            // Mettre à jour le compte à rebours
            const timer = setInterval(async () => {
                timeLeft--;
                nextHintIn = Math.max(0, nextHintIn - 1);
                
                if (timeLeft > 0) {
                    try {
                        await message.edit({
                            content: `${target}, ${question}\n\n⏰ Temps restant: ${timeLeft} secondes\n💡 Prochain indice dans: ${nextHintIn} secondes`
                        });
                    } catch (error) {
                        console.error('Error updating timer:', error);
                    }
                }
            }, 1000);

            let hasResponded = false;

            collector.on('collect', async (msg) => {
                sentMessages.push(msg);
                
                const evaluation = await checkAnswer(msg.content, answer);
                
                if (evaluation.isCorrect) {
                    hasResponded = true;
                    clearInterval(timer);
                    clearInterval(hintTimer);
                    const congratsMsg = await channel.send(`🎉 Bravo ${target} ! ${evaluation.explanation}`);
                    sentMessages.push(congratsMsg);
                    collector.stop();
                } else {
                    const wrongMsg = await channel.send(`❌ ${target}, ${evaluation.explanation}. Continue d'essayer !`);
                    sentMessages.push(wrongMsg);
                    setTimeout(() => wrongMsg.delete().catch(console.error), 5000);
                }
            });

            collector.on('end', async () => {
                clearInterval(timer);
                clearInterval(hintTimer);
                
                if (!hasResponded) {
                    console.log('No correct response received, executing punishment');
                    
                    const timeoutMsg = await channel.send(`⏰ Temps écoulé ! La réponse était: ${answer}`);
                    sentMessages.push(timeoutMsg);
                    
                    // Punition: Multi Ping + Force Rename
                    try {
                        await trollActions.find(a => a.name === 'multiPing')?.execute(target);
                        await trollActions.find(a => a.name === 'forceNickname')?.execute(target);
                    } catch (error) {
                        console.error('Error executing punishment:', error);
                    }
                }

                // Supprimer tous les messages après 10 secondes
                setTimeout(() => {
                    sentMessages.forEach(msg => {
                        msg.delete().catch(console.error);
                    });
                }, 10000);
            });

        } catch (error) {
            console.error('Error in discussion troll:', error);
        }
    }
}; 