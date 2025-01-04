import { Client, GuildMember, Message } from 'discord.js';
import { trollActions } from './actions/TrollActions';
import OpenAI from 'openai';

interface UserContext {
    userId: string;
    lastTrollTime: number;
    voiceTime: number;
    messageCount: number;
    lastActivity: Date;
}

export class AutomationManager {
    private readonly openai: OpenAI;
    private userContexts: Map<string, UserContext> = new Map();
    private readonly GLOBAL_COOLDOWN = 1800000; // 30 minutes
    private readonly MIN_VOICE_TIME = 300000;   // 5 minutes en vocal
    private readonly MIN_MESSAGES = 5;          // Minimum de messages
    private readonly TROLL_CHANCE = 0.3;        // 30% de chance de troll
    private checkInterval: NodeJS.Timeout;
    private client: Client | null = null;

    constructor(apiKey: string) {
        this.openai = new OpenAI({ apiKey });
        this.checkInterval = setInterval(() => this.checkForTrollOpportunities(), 60000); // Vérifier toutes les minutes
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

    private async shouldTrollUser(member: GuildMember): Promise<boolean> {
        const context = this.getOrCreateUserContext(member.id);
        const now = Date.now();

        // Vérifier le cooldown global
        if (now - context.lastTrollTime < this.GLOBAL_COOLDOWN) {
            console.log(`Cooldown actif pour ${member.displayName} (${Math.floor((this.GLOBAL_COOLDOWN - (now - context.lastTrollTime)) / 60000)} minutes restantes)`);
            return false;
        }

        // Vérifier si l'utilisateur est actif
        const isActive = (now - context.lastActivity.getTime()) < 300000; // 5 minutes
        if (!isActive) {
            console.log(`${member.displayName} n'est pas actif`);
            return false;
        }

        // Critères pour augmenter les chances de troll
        let trollChance = this.TROLL_CHANCE;

        // Augmenter les chances si en vocal
        if (member.voice.channel) {
            trollChance += 0.2;
            console.log(`${member.displayName} est en vocal (+20% de chances)`);
        }

        // Augmenter les chances si beaucoup de messages récents
        if (context.messageCount >= this.MIN_MESSAGES) {
            trollChance += 0.1;
            console.log(`${member.displayName} est actif dans le chat (+10% de chances)`);
        }

        // Augmenter les chances si longtemps en vocal
        if (context.voiceTime >= this.MIN_VOICE_TIME) {
            trollChance += 0.1;
            console.log(`${member.displayName} est en vocal depuis longtemps (+10% de chances)`);
        }

        // Décision finale avec un élément aléatoire
        const shouldTroll = Math.random() < trollChance;
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
                const action = trollActions.find(a => a.name === actionName);
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
        // Mettre à jour le temps en vocal pour tous les utilisateurs
        for (const [userId, context] of this.userContexts.entries()) {
            const guild = await this.getGuild();
            if (!guild) continue;

            try {
                const member = await guild.members.fetch(userId);
                if (member.voice.channel) {
                    context.voiceTime += 60000; // +1 minute
                    context.lastActivity = new Date();
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
} 