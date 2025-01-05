import { Client, GuildMember, Message } from 'discord.js';
import { trollActions } from './actions';
import OpenAI from 'openai';
import { TrollAction } from './types/AutomationType';
import { trollConfig } from './config/troll.config';
import { TrollDatabase } from './database/TrollDatabase';

export interface UserContext {
    userId: string;
    lastTrollTime: number;
    voiceTime: number;
    messageCount: number;
    lastActivity: Date;
    baseChance: number;         // Chance de base qui évolue dans le temps
    lastMessageTime: number;    // Dernier message envoyé
    lastVoiceJoin: number;     // Dernière connexion vocale
    activityStreak: number;     // Jours consécutifs d'activité
    lastTrollAttempt?: {
        timestamp: number;
        chance: number;
        success: boolean;
    };
}

export class AutomationManager {
    private readonly openai: OpenAI;
    private readonly db: TrollDatabase;
    private userContexts: Map<string, UserContext> = new Map();
    private checkInterval: NodeJS.Timeout;
    private client: Client | null = null;
    private lastActionUses: Map<string, number> = new Map();
    private nextCheckTime: number;
    private static instance: AutomationManager | null = null;

    private constructor(apiKey: string) {
        this.openai = new OpenAI({ apiKey });
        this.db = new TrollDatabase();
        this.nextCheckTime = Date.now() + trollConfig.global.checkInterval;
        
        // Check troll opportunities and voice time
        this.checkInterval = setInterval(() => {
            this.checkForTrollOpportunities();
            this.checkForWeeklyReset();
            this.updateVoiceTime();
            this.nextCheckTime = Date.now() + trollConfig.global.checkInterval;
        }, trollConfig.global.checkInterval);
    }

    public static getInstance(apiKey: string): AutomationManager {
        if (!AutomationManager.instance) {
            AutomationManager.instance = new AutomationManager(apiKey);
        }
        return AutomationManager.instance;
    }

    public async init() {
        await this.db.init();
        // Charger les données des utilisateurs depuis la DB
        const users = await this.db.getAllUsers();
        for (const [userId, context] of users) {
            // Ensure lastActivity is a Date object
            if (!(context.lastActivity instanceof Date)) {
                context.lastActivity = new Date(context.lastActivity);
            }
            // Ensure lastTrollTime is initialized
            if (context.lastTrollTime === undefined) {
                context.lastTrollTime = 0;
            }
            this.userContexts.set(userId, context);
        }
    }

    public getNextCheckTime(): number {
        const now = Date.now();
        if (this.nextCheckTime <= now) {
            this.nextCheckTime = now + trollConfig.global.checkInterval;
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

        const userChances = Array.from(this.userContexts.entries())
            .map(([userId, context]) => {
                const member = guild.members.cache.get(userId);
                if (!member) return null;
                const { total, base, bonus, cooldown } = this.getTrollChanceDetails(member);
                const isActive = (now - context.lastActivity.getTime() < trollConfig.global.activityTimeout);
                return { userId, context, total, base, bonus, cooldown, isActive };
            })
            .filter(entry => entry !== null && entry.isActive)
            .sort((a, b) => (b!.base + b!.bonus) - (a!.base + a!.bonus));

        debug += `👥 Utilisateurs Éligibles\n`;
        for (const entry of userChances) {
            if (!entry) continue;
            const { userId, context, total, base, bonus, cooldown } = entry;
            const member = guild.members.cache.get(userId);
            if (!member) continue;

            const minutesSinceActivity = Math.floor((now - context.lastActivity.getTime()) / 60000);
            const inVoice = member.voice.channel ? '🎤' : '❌';
            const cooldownIcon = cooldown ? '🕒 ' : '';
            
            debug += `${inVoice} ${cooldownIcon}${member.displayName}: ${Math.floor(total * 100)}% (${Math.floor(base * 100)}% + ${Math.floor(bonus * 100)}%)\n`;
            debug += `├ Activité: ${minutesSinceActivity}min | Msgs: ${context.messageCount} | Vocal: ${Math.floor(context.voiceTime/60000)}min\n`;
            
            // Afficher le dernier troll basé sur la dernière tentative réussie ou lastTrollTime
            const lastSuccessfulTroll = context.lastTrollAttempt?.success ? context.lastTrollAttempt.timestamp : context.lastTrollTime;
            if (lastSuccessfulTroll) {
                debug += `├ Dernier troll: ${Math.floor((now - lastSuccessfulTroll)/60000)}min\n`;
            } else {
                debug += `├ Dernier troll: jamais\n`;
            }
            
            if (context.lastTrollAttempt) {
                const timeSinceAttempt = Math.floor((now - context.lastTrollAttempt.timestamp) / 60000);
                debug += `└ Tentative: ${timeSinceAttempt}min (${Math.floor(context.lastTrollAttempt.chance * 100)}% - ${context.lastTrollAttempt.success ? '✅' : '❌'})\n`;
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
            const context: UserContext = {
                userId,
                lastTrollTime: 0,
                voiceTime: 0,
                messageCount: 0,
                lastActivity: new Date(),
                baseChance: trollConfig.global.startingChance,
                lastMessageTime: 0,
                lastVoiceJoin: 0,
                activityStreak: 0
            };
            this.userContexts.set(userId, context);
            void this.db.setUser(userId, context);
        }
        const context = this.userContexts.get(userId)!;
        if (!(context.lastActivity instanceof Date)) {
            context.lastActivity = new Date(context.lastActivity);
        }
        // Ensure lastTrollTime is initialized
        if (context.lastTrollTime === undefined) {
            context.lastTrollTime = 0;
        }
        return context;
    }

    public getTrollChance(member: GuildMember, ignoreCooldown: boolean = false): number {
        const context = this.getOrCreateUserContext(member.id);
        const now = Date.now();

        // Ne pas troller si l'utilisateur est en mute casque
        if (member.voice.selfDeaf) {
            return 0;
        }

        // Vérifie le cooldown global de 4 heures sauf si ignoreCooldown est true
        const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 heures en millisecondes
        if (!ignoreCooldown && now - context.lastTrollTime < FOUR_HOURS) {
            return 0;
        }

        if (now - context.lastActivity.getTime() >= trollConfig.global.activityTimeout) {
            return 0;
        }

        let temporaryBonus = 0;

        if (member.voice.channel && !member.voice.selfDeaf) {
            temporaryBonus += trollConfig.temporaryBonuses.inVoiceChat;
        }

        if (context.messageCount >= trollConfig.temporaryBonuses.minMessages) {
            temporaryBonus += trollConfig.temporaryBonuses.recentMessages;
        }

        if (context.voiceTime >= trollConfig.temporaryBonuses.minVoiceTime) {
            temporaryBonus += trollConfig.temporaryBonuses.voiceTime;
        }

        return Math.min(context.baseChance + temporaryBonus, trollConfig.global.maxTotalChance);
    }

    private async updateBaseChance(userId: string) {
        const context = this.getOrCreateUserContext(userId);
        const now = Date.now();

        const hasActivityToday = (now - context.lastMessageTime < trollConfig.global.activityTimeout) || 
                               (now - context.lastVoiceJoin < trollConfig.global.activityTimeout);

        if (hasActivityToday) {
            context.activityStreak++;
            context.baseChance = Math.min(
                context.baseChance + trollConfig.global.activityBonus + (context.activityStreak * trollConfig.global.streakBonus),
                trollConfig.global.maxBaseChance
            );
        } else {
            context.activityStreak = 0;
            context.baseChance = Math.max(
                context.baseChance - trollConfig.global.dailyDecay,
                trollConfig.global.minBaseChance
            );
        }

        this.db.setUser(userId, context);
    }

    private async shouldTrollUser(member: GuildMember): Promise<boolean> {
        const trollChance = this.getTrollChance(member);
        const context = this.getOrCreateUserContext(member.id);
        const shouldTroll = Math.random() < trollChance;
        const now = Date.now();

        context.lastTrollAttempt = {
            timestamp: now,
            chance: trollChance,
            success: shouldTroll
        };

        if (shouldTroll) {
            // Reset la chance et applique le cooldown quand le troll réussit
            context.lastTrollTime = now;
            context.baseChance = trollConfig.global.startingChance;
            context.messageCount = 0;
            context.voiceTime = 0;
            console.log(`Reset des stats de ${member.displayName} après un troll réussi`);
        }

        void this.db.setUser(member.id, context);

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
        if (!action) return null;

        const actionName = action.trim().toLowerCase();
        const actionConfig = trollConfig.actions[actionName as keyof typeof trollConfig.actions];
        
        if (!actionConfig) return null;

        // Vérifier si l'action a les conditions requises
        const trollChance = this.getTrollChance(member);
        if (trollChance < actionConfig.requiredChance) {
            console.log(`Action ${actionName} requiert ${actionConfig.requiredChance * 100}% de chance (actuel: ${trollChance * 100}%)`);
            return null;
        }

        return actionName;
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;

        const context = this.getOrCreateUserContext(message.author.id);
        context.messageCount++;
        context.lastActivity = new Date();
        context.lastMessageTime = Date.now();

        await this.updateBaseChance(message.author.id);

        const member = message.member;
        if (!member) return;

        if (await this.shouldTrollUser(member)) {
            const actionName = await this.selectAction(member);
            if (actionName) {
                const action = trollActions.find((a: TrollAction) => a.name === actionName);
                if (action) {
                    console.log(`Exécution de l'action ${actionName} sur ${member.displayName}`);
                    await action.execute(member);
                    
                    context.lastTrollTime = Date.now();
                    context.messageCount = 0;
                    this.db.setUser(member.id, context);
                }
            }
        }
    }

    private async checkForTrollOpportunities(): Promise<void> {
        const guild = await this.getGuild();
        if (!guild) return;

        const now = Date.now();

        // Mettre à jour les chances pour tous les utilisateurs actifs
        for (const [userId, context] of this.userContexts.entries()) {
            try {
                const member = await guild.members.fetch(userId);
                const isActive = (now - context.lastActivity.getTime() < trollConfig.global.activityTimeout);
                
                if (isActive) {
                    await this.updateBaseChance(userId);

                    if (member.voice.channel) {
                        if (!context.lastVoiceJoin) {
                            context.lastVoiceJoin = now;
                        }
                    } else if (context.lastVoiceJoin) {
                        // Si l'utilisateur vient de quitter le vocal, on met à jour son temps total
                        context.voiceTime += now - context.lastVoiceJoin;
                        context.lastVoiceJoin = 0;
                        this.db.setUser(userId, context);
                    }

                    if (await this.shouldTrollUser(member)) {
                        const actionName = await this.selectAction(member);
                        if (actionName) {
                            const action = trollActions.find((a: TrollAction) => a.name === actionName);
                            if (action) {
                                console.log(`Exécution de l'action ${actionName} sur ${member.displayName}`);
                                await action.execute(member);
                            }
                        }
                    }
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
                this.lastActionUses.set(action.name, Date.now());
            }
        }
    }

    public cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.db.cleanup();
    }

    public getBaseChance(member: GuildMember): number {
        const context = this.getOrCreateUserContext(member.id);
        return context.baseChance;
    }

    public getTrollChanceDetails(member: GuildMember): { total: number; base: number; bonus: number; cooldown: boolean } {
        const context = this.getOrCreateUserContext(member.id);
        const now = Date.now();
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        const inCooldown = now - context.lastTrollTime < FOUR_HOURS;

        const total = this.getTrollChance(member, true); // Ignore le cooldown pour avoir la vraie chance
        const base = this.getBaseChance(member);
        const bonus = Math.max(0, total - base);
        
        return { 
            total: inCooldown ? 0 : total,  // 0 si en cooldown
            base,                           // Toujours afficher la chance de base
            bonus,                          // Toujours afficher le bonus
            cooldown: inCooldown
        };
    }

    public formatTrollChance(member: GuildMember): string {
        const { total, base, bonus, cooldown } = this.getTrollChanceDetails(member);
        if (cooldown) {
            return `🕒 En cooldown (${Math.floor(base * 100)}% + ${Math.floor(bonus * 100)}% bonus)`;
        }
        return `${Math.floor(total * 100)}% (${Math.floor(base * 100)}% + ${Math.floor(bonus * 100)}% bonus)`;
    }

    public async setBaseChance(member: GuildMember, chance: number): Promise<void> {
        const context = this.getOrCreateUserContext(member.id);
        context.baseChance = Math.min(Math.max(chance, trollConfig.global.minBaseChance), trollConfig.global.maxBaseChance);
        await this.db.setUser(member.id, context);
    }

    public async saveUserContext(context: UserContext): Promise<void> {
        this.userContexts.set(context.userId, context);
        await this.db.setUser(context.userId, context);
    }

    public getUserContext(userId: string): UserContext | undefined {
        return this.userContexts.get(userId);
    }

    public async resetAllTrollChances(): Promise<void> {
        const users = Array.from(this.userContexts.values());
        for (const context of users) {
            context.baseChance = trollConfig.global.startingChance;
            context.messageCount = 0;
            context.voiceTime = 0;
            context.activityStreak = 0;
            context.lastTrollTime = 0;
            context.lastTrollAttempt = undefined;
            await this.db.setUser(context.userId, context);
        }
        console.log('Reset hebdomadaire des chances de troll effectué');
    }

    private async checkForWeeklyReset(): Promise<void> {
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() === 23 && now.getMinutes() === 59) {
            await this.resetAllTrollChances();
        }
    }

    private async updateVoiceTime(): Promise<void> {
        const guild = await this.getGuild();
        if (!guild) return;

        const now = Date.now();
        for (const [userId, context] of this.userContexts) {
            const member = guild.members.cache.get(userId);
            if (member?.voice.channel) {
                if (!context.lastVoiceJoin) {
                    context.lastVoiceJoin = now;
                }
                // On met à jour le temps vocal périodiquement pour les utilisateurs en vocal
                context.voiceTime += trollConfig.global.checkInterval;
                await this.db.setUser(userId, context);
            }
        }
    }

    public async resetCooldown(member: GuildMember): Promise<void> {
        const context = this.getOrCreateUserContext(member.id);
        context.lastTrollTime = 0;
        await this.db.setUser(member.id, context);
    }

    public async resetAllCooldowns(): Promise<void> {
        const users = Array.from(this.userContexts.values());
        for (const context of users) {
            context.lastTrollTime = 0;
            await this.db.setUser(context.userId, context);
        }
        console.log('Reset des cooldowns effectué');
    }
} 