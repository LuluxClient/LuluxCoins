import { Message } from 'discord.js';

export class PoliticsManager {
    private readonly targetUserId = '634001864073019392';
    private readonly triggerWords = ['lfi', 'melanchon', 'bardella', 'rn', 'vote', 'rassemblement', 'politique', 'tg', 'gueule', 'article'];
    private readonly responses = [
        'Ferme ta gueule fils de pute',
        'On s\'en bat les couilles',
        'Bardella > Melanchon',
        'T\'es brainwashed par les médias de gauche',
        'Nique ta mère avec la politique',
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

        // Check if message contains any trigger words or their variations (case insensitive)
        const messageContent = message.content.toLowerCase();
        const messageWords = messageContent.split(/\s+/); // Split by whitespace
        
        const hasTriggerWord = this.triggerWords.some(trigger => 
            messageWords.some(word => 
                word.includes(trigger) || // Exact match or contains
                word.startsWith(trigger) || // Starts with (e.g., "vote" matches "voted", "voting")
                word.endsWith(trigger) || // Ends with
                (trigger.length > 4 && word.includes(trigger.slice(0, -1))) // Partial match for longer words
            )
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