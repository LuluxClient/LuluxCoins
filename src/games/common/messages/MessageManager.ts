import { Message } from 'discord.js';

export class MessageManager {
    private messageTimeouts: Map<string, NodeJS.Timeout> = new Map();

    scheduleMessageDeletion(message: Message, delay: number): void {
        // Annuler le timeout existant s'il y en a un
        const existingTimeout = this.messageTimeouts.get(message.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Créer un nouveau timeout
        const timeout = setTimeout(() => {
            message.delete().catch(console.error);
            this.messageTimeouts.delete(message.id);
        }, delay);

        this.messageTimeouts.set(message.id, timeout);
    }

    clearMessageTimeout(messageId: string): void {
        const timeout = this.messageTimeouts.get(messageId);
        if (timeout) {
            clearTimeout(timeout);
            this.messageTimeouts.delete(messageId);
        }
    }
}

export const messageManager = new MessageManager(); 