import { Message } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

interface TriggerWordsData {
    words: string[];
    enabled: boolean;
}

export class PoliticsManager {
    private readonly targetUserId = '634001864073019392';
    private readonly allowedUsers = ['295515087731556362', '273898521344606208'];
    private triggerWords: string[] = [];
    private enabled: boolean = true;
    private readonly dbPath: string;
    private readonly responses = [
        'Ferme ta gueule fils de pute',
        'On s\'en bat les couilles',
        'Bardella > Melanchon',
        'T\'es brainwashed par les médias de gauche',
        'Nique ta mère avec la politique',
    ];
    private lastMessageTime: number = 0;
    private readonly cooldownDuration = 0.5 * 60 * 1000; // 30 seconds in milliseconds
    private isInitialized: boolean = false;

    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'triggerwords.json');
    }

    isAllowedUser(userId: string): boolean {
        return this.allowedUsers.includes(userId);
    }

    async init() {
        if (!this.isInitialized) {
            await this.loadTriggerWords();
            this.isInitialized = true;
        }
    }

    private async loadTriggerWords() {
        try {
            // Create data directory if it doesn't exist
            const dirPath = path.dirname(this.dbPath);
            await fs.mkdir(dirPath, { recursive: true });

            let data: string;
            try {
                data = await fs.readFile(this.dbPath, 'utf-8');
            } catch (error) {
                // File doesn't exist, create with default words
                const defaultWords = [
                    "lfi", "melanchon", "bardella", "rn", "vote",
                    "rassemblement", "politique", "tg", "gueule",
                    "article", "marine", "lepen", "propagande", "homo",
                    "désarmé", "police", "terroriste", "islamiste", "islamophobe"
                ];
                this.triggerWords = defaultWords;
                this.enabled = true;
                await this.saveTriggerWords();
                return;
            }

            const parsed = JSON.parse(data) as TriggerWordsData;
            this.triggerWords = parsed.words;
            this.enabled = parsed.enabled ?? true;
        } catch (error) {
            console.error('Error loading trigger words:', error);
            // If there's any other error, initialize with empty array
            this.triggerWords = [];
            this.enabled = true;
            await this.saveTriggerWords();
        }
    }

    private async saveTriggerWords() {
        try {
            const data: TriggerWordsData = { 
                words: this.triggerWords,
                enabled: this.enabled
            };
            await fs.writeFile(this.dbPath, JSON.stringify(data, null, 4));
        } catch (error) {
            console.error('Error saving trigger words:', error);
        }
    }

    private getRandomResponse(): string {
        return this.responses[Math.floor(Math.random() * this.responses.length)];
    }

    async setEnabled(enabled: boolean): Promise<void> {
        await this.init();
        this.enabled = enabled;
        await this.saveTriggerWords();
    }

    async isEnabled(): Promise<boolean> {
        await this.init();
        return this.enabled;
    }

    getCooldownRemaining(): number {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        const remainingTime = Math.max(0, this.cooldownDuration - timeSinceLastMessage);
        return Math.ceil(remainingTime / 1000); // Return remaining seconds
    }

    // Add a new trigger word
    async addTriggerWord(word: string): Promise<boolean> {
        await this.init();
        word = word.toLowerCase();
        if (this.triggerWords.includes(word)) {
            return false;
        }
        this.triggerWords.push(word);
        await this.saveTriggerWords();
        return true;
    }

    // Remove a trigger word
    async removeTriggerWord(word: string): Promise<boolean> {
        await this.init();
        word = word.toLowerCase();
        const index = this.triggerWords.indexOf(word);
        if (index === -1) {
            return false;
        }
        this.triggerWords.splice(index, 1);
        await this.saveTriggerWords();
        return true;
    }

    // Get all trigger words
    async getTriggerWords(): Promise<string[]> {
        await this.init();
        return [...this.triggerWords];
    }

    async handleMessage(message: Message) {
        await this.init();
        // Ignore bot messages and messages from other users
        if (message.author.bot || message.author.id !== this.targetUserId || !this.enabled) {
            return;
        }

        // Check cooldown
        const now = Date.now();
        if (now - this.lastMessageTime < this.cooldownDuration) {
            return;
        }

        // Check if message contains any trigger words (case insensitive)
        const messageContent = message.content.toLowerCase();
        // Split by any non-word character (spaces, punctuation, etc.)
        const messageWords = messageContent.split(/\W+/);
        
        const hasTriggerWord = this.triggerWords.some(trigger => 
            messageWords.includes(trigger.toLowerCase())
        );

        if (hasTriggerWord) {
            this.lastMessageTime = now;
            await message.reply({
                content: this.getRandomResponse(),
                failIfNotExists: false
            });
        }
    }
}

// Export a single instance to be used across the application
export const politicsManager = new PoliticsManager(); 