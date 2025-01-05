import { GuildMember } from 'discord.js';
import { UserContext } from '../AutomationManager';

export interface TrollAction {
    name: string;
    description: string;
    cooldown: number;
    canExecute?: (member: GuildMember, context: UserContext) => Promise<boolean>;
    execute: (target: GuildMember) => Promise<void>;
}

export interface TrollContext {
    lastAction?: string;
    isInVoice: boolean;
    messageCount: number;
    timeInServer: number;
    activityType?: string;
    forcedAction?: string;
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface TrollConfig {
    global: {
        startingChance: number;
        maxBaseChance: number;
        minBaseChance: number;
        maxTotalChance: number;
        dailyDecay: number;
        activityBonus: number;
        streakBonus: number;
        activityTimeout: number;
        globalCooldown: number;
        checkInterval: number;
    };
    temporaryBonuses: {
        inVoiceChat: number;
        recentMessages: number;
        voiceTime: number;
        minMessages: number;
        minVoiceTime: number;
    };
    actions: {
        discussion: {
            cooldown: number;
            requiredChance: number;
            minRecentMessages: number;
            recentMessageWindow: number;
            questionTimeout: number;
            hintInterval: number;
        };
        channelRoulette: {
            cooldown: number;
            requiredChance: number;
            returnDelay: number;
        };
        multiPing: {
            cooldown: number;
            requiredChance: number;
            deleteDelay: number;
        };
        randomLocalSound: {
            cooldown: number;
            requiredChance: number;
        };
        youtubeSound: {
            cooldown: number;
            requiredChance: number;
        };
        tempChannelNames: {
            cooldown: number;
            requiredChance: number;
            duration: number;
        };
        surpriseAI: {
            cooldown: number;
            requiredChance: number;
        };
        forceNickname: {
            cooldown: number;
            requiredChance: number;
            duration: number;
        };
    };
}

export interface AutomationConfig {
    openaiApiKey: string;
    soundsFolder: string;
    cooldownMultiplier: number;
    maxActionsPerHour: number;
} 