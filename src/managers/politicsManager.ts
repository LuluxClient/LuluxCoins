import { Message } from 'discord.js';

export class PoliticsManager {
    private readonly targetUserId = '273898521344606208';
    // private readonly targetUserId = '634001864073019392';
    private readonly triggerWords = ['lfi', 'melanchon', 'bardella'];
    private readonly responses = [
        'Ferme ta gueule avec la politique',
        'On s\'en bat les couilles de la politique',
        'Ta gueule avec la politique fdp',
        'Politique = ratio',
        'Nique ta mère avec la politique',
        'Politique = 🤓',
        'Politique = 🤡'
    ];
    private lastMessageTime: number = 0;
    private readonly cooldownDuration = 3 * 60 * 1000; // 3 minutes in milliseconds

    private getRandomResponse(): string {
        return this.responses[Math.floor(Math.random() * this.responses.length)];
    }

    async handleMessage(message: Message) {
        // Ignore bot messages and messages from other users
        if (message.author.bot || message.author.id !== this.targetUserId) {
            return;
        }

        // Check cooldown
        const now = Date.now();
        if (now - this.lastMessageTime < this.cooldownDuration) {
            return;
        }

        // Check if message contains any trigger words (case insensitive)
        const messageContent = message.content.toLowerCase();
        const hasTriggerWord = this.triggerWords.some(word => messageContent.includes(word.toLowerCase()));

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