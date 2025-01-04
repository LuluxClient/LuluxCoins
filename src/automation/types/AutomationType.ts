import { GuildMember } from 'discord.js';

export interface TrollAction {
    name: string;
    description: string;
    cooldown: number; // in milliseconds
    execute: (target: GuildMember) => Promise<void>;
}

export interface TrollContext {
    lastAction?: string;
    isInVoice: boolean;
    messageCount: number;
    timeInServer: number; // in milliseconds
    activityType?: string;
    forcedAction?: string;
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AutomationConfig {
    openaiApiKey: string;
    soundsFolder: string;
    cooldownMultiplier: number;
    maxActionsPerHour: number;
} 