import { Client, GuildMember, Message } from 'discord.js';
import { trollActions } from './actions';
import OpenAI from 'openai';
import { TrollAction } from './types/AutomationType';

interface UserContext {
    userId: string;
    lastTrollTime: number;
    voiceTime: number;
    messageCount: number;
    lastActivity: Date;
    lastTrollAttempt?: {
        timestamp: number;
        chance: number;
        success: boolean;
    };
}

export class AutomationManager {
    private readonly openai: OpenAI;
    private userContexts: Map<string, UserContext> = new Map();
    private readonly GLOBAL_COOLDOWN = 1800000; // 30 minutes
    public readonly MIN_VOICE_TIME = 300000;   // 5 minutes en vocal
    public readonly MIN_MESSAGES = 5;          // Minimum de messages
    public readonly TROLL_CHANCE = 0.3;        // 30% de chance de troll
    private readonly CHECK_INTERVAL = 300000;  // 5 minutes
    private checkInterval: NodeJS.Timeout;
    private client: Client | null = null;
    private lastActionUses: Map<string, number> = new Map();
    private nextCheckTime: number;

    constructor(apiKey: string) {
        this.openai = new OpenAI({ apiKey });
        this.nextCheckTime = Date.now() + this.CHECK_INTERVAL;
        this.checkInterval = setInterval(() => {
            this.checkForTrollOpportunities();
            this.nextCheckTime = Date.now() + this.CHECK_INTERVAL;
        }, this.CHECK_INTERVAL);
    }

    public getNextCheckTime(): number {
        const now = Date.now();
        // Si le nextCheckTime est dépassé, on le met à jour
        if (this.nextCheckTime <= now) {
            this.nextCheckTime = now + this.CHECK_INTERVAL;
        }
        return this.nextCheckTime;
    }

    public getLastActionUse(actionName: string): number {
        return this.lastActionUses.get(actionName) || 0;
    }

    public getDebugInfo(): string {
        const now = Date.now();
        let debug = '';
        const guild = this.client?.guilds.cache.first();
        if (!guild) return 'Aucun serveur trouvé';

        // Trier les utilisateurs par chance de troll
        const userChances = Array.from(this.userContexts.entries())
            .map(([userId, context]) => {
                const member = guild.members.cache.get(userId);
                if (!member) return null;
                const chance = this.getTrollChance(member);
                return { userId, context, chance };
            })
            .filter(entry => entry !== null && entry.chance > 0.01) // Filtrer les chances > 1%
            .sort((a, b) => b!.chance - a!.chance);

        for (const entry of userChances) {
            if (!entry) continue;
            const { userId, context, chance } = entry;
            const minutesSinceActivity = Math.floor((now - context.lastActivity.getTime()) / 60000);
            
            debug += `<@${userId}> (${Math.floor(chance * 100)}% de chance):\n`;
            debug += `- Dernière activité: il y a ${minutesSinceActivity}min\n`;
            debug += `- Messages: ${context.messageCount}\n`;
            debug += `- Temps en vocal: ${Math.floor(context.voiceTime/60000)}min\n`;
            debug += `- Dernier troll: ${context.lastTrollTime ? `il y a ${Math.floor((now - context.lastTrollTime)/60000)}min` : 'jamais'}\n`;
            
            if (context.lastTrollAttempt) {
                const timeSinceAttempt = Math.floor((now - context.lastTrollAttempt.timestamp) / 60000);
                debug += `- Dernière tentative: il y a ${timeSinceAttempt}min (${Math.floor(context.lastTrollAttempt.chance * 100)}% - ${context.lastTrollAttempt.success ? '✅' : '❌'})\n`;
            }
            
            debug += '\n';
        }
        
        return debug || 'Aucun utilisateur éligible au troll';
    }

    public setClient(client: Client) {
        this.client = client;
    }

    private getOrCreateUserContext(userId: string): UserContext {
        if (!this.userContexts.has(userId)) {
            this.userContexts.set(userId, {
                userId,
                lastTrollTime: 0,
                voiceTime: 0,
                messageCount: 0,
                lastActivity: new Date()
            });
        }
        return this.userContexts.get(userId)!;
    }

    public getTrollChance(member: GuildMember): number {
        const context = this.getOrCreateUserContext(member.id);
        const now = Date.now();

        // Si cooldown actif, retourne 0%
        if (now - context.lastTrollTime < this.GLOBAL_COOLDOWN) {
            return 0;
        }

        // Si inactif depuis 5 minutes, retourne 0%
        if (now - context.lastActivity.getTime() >= 300000) {
            return 0;
        }

        let trollChance = this.TROLL_CHANCE;

        // Bonus vocal
        if (member.voice.channel) {
            trollChance += 0.2;
        }

        // Bonus messages
        if (context.messageCount >= this.MIN_MESSAGES) {
            trollChance += 0.1;
        }

        // Bonus temps vocal
        if (context.voiceTime >= this.MIN_VOICE_TIME) {
            trollChance += 0.1;
        }

        return trollChance;
    }

    private async shouldTrollUser(member: GuildMember): Promise<boolean> {
        const trollChance = this.getTrollChance(member);
        const context = this.getOrCreateUserContext(member.id);
        const shouldTroll = Math.random() < trollChance;

        // Enregistrer la tentative
        context.lastTrollAttempt = {
            timestamp: Date.now(),
            chance: trollChance,
            success: shouldTroll
        };

        console.log(`Chance de troll pour ${member.displayName}: ${Math.floor(trollChance * 100)}% - Résultat: ${shouldTroll ? 'OUI' : 'NON'}`);
        return shouldTroll;
    }

    private async selectAction(member: GuildMember): Promise<string | null> {
        const context = {
            inVoice: member.voice.channel ? true : false,
            messageCount: this.getOrCreateUserContext(member.id).messageCount,
            voiceTime: this.getOrCreateUserContext(member.id).voiceTime,
            activity: member.presence?.activities[0]?.name || 'rien'
        };

        // Demander à OpenAI de choisir une action appropriée
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Choisis UNE action de troll parmi: channelRoulette, multiPing, randomLocalSound, tempChannelNames, discussion, youtubeSound, surpriseAI, forceNickname.
                    Contexte: L'utilisateur ${member.displayName}
                    - ${context.inVoice ? 'Est' : 'N\'est pas'} en vocal
                    - A envoyé ${context.messageCount} messages récemment
                    - Est en vocal depuis ${Math.floor(context.voiceTime / 60000)} minutes
                    - Activité actuelle: ${context.activity}
                    
                    Réponds uniquement avec le nom de l'action choisie.`
                }
            ],
            max_tokens: 50,
            temperature: 0.8,
        });

        const action = response.choices[0]?.message?.content || null;
        return action && trollActions.some(a => a.name === action.trim().toLowerCase()) ? action.trim().toLowerCase() : null;
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;

        const context = this.getOrCreateUserContext(message.author.id);
        context.messageCount++;
        context.lastActivity = new Date();

        const member = message.member;
        if (!member) return;

        if (await this.shouldTrollUser(member)) {
            const actionName = await this.selectAction(member);
            if (actionName) {
                const action = trollActions.find((a: TrollAction) => a.name === actionName);
                if (action) {
                    console.log(`Exécution de l'action ${actionName} sur ${member.displayName}`);
                    await action.execute(member);
                    
                    // Mettre à jour le contexte
                    context.lastTrollTime = Date.now();
                    context.messageCount = 0; // Reset le compteur
                }
            }
        }
    }

    private async checkForTrollOpportunities(): Promise<void> {
        const guild = await this.getGuild();
        if (!guild) return;

        // Mettre à jour le temps en vocal pour tous les utilisateurs
        for (const [userId, context] of this.userContexts.entries()) {
            try {
                const member = await guild.members.fetch(userId);
                if (member.voice.channel) {
                    context.voiceTime += this.CHECK_INTERVAL; // +5 minutes
                    context.lastActivity = new Date();

                    // Vérifier si on doit troller l'utilisateur
                    if (await this.shouldTrollUser(member)) {
                        const actionName = await this.selectAction(member);
                        if (actionName) {
                            const action = trollActions.find((a: TrollAction) => a.name === actionName);
                            if (action) {
                                console.log(`Exécution de l'action ${actionName} sur ${member.displayName} (check vocal)`);
                                await action.execute(member);
                                
                                // Mettre à jour le contexte
                                context.lastTrollTime = Date.now();
                                context.messageCount = 0;
                            }
                        }
                    }
                } else {
                    context.voiceTime = 0; // Reset si pas en vocal
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification de l'utilisateur ${userId}:`, error);
            }
        }
    }

    private async getGuild() {
        return this.client?.guilds.cache.first();
    }

    public async handleUserAction(target: GuildMember, context: { forcedAction?: string } = {}) {
        const actionName = context.forcedAction || await this.selectAction(target);
        if (actionName) {
            const action = trollActions.find(a => a.name === actionName);
            if (action) {
                console.log(`Exécution de l'action ${actionName} sur ${target.displayName}`);
                await action.execute(target);
            }
        }
    }

    public cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    private async executeAction(action: TrollAction, target: GuildMember): Promise<void> {
        try {
            await action.execute(target);
            this.lastActionUses.set(action.name, Date.now());
        } catch (error) {
            console.error(`Error executing action ${action.name}:`, error);
        }
    }
} 