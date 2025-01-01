import { Message } from 'discord.js';

interface CooldownData {
    timer: NodeJS.Timeout;
    message?: Message;
    callback?: () => void;
    startTime: number;
    duration: number;
}

export class CooldownManager {
    private cooldowns: Map<string, CooldownData> = new Map();

    /**
     * Crée un nouveau cooldown
     * @param key Identifiant unique du cooldown (ex: 'game_${gameId}' ou 'stats_${userId}')
     * @param duration Durée en millisecondes
     * @param callback Fonction à exécuter à la fin du cooldown
     * @param message Message Discord associé (optionnel)
     */
    startCooldown(key: string, duration: number, callback?: () => void, message?: Message): void {
        // Nettoyer l'ancien cooldown s'il existe
        this.clearCooldown(key);

        const timer = setTimeout(() => {
            if (message) {
                message.delete().catch(error => {
                    console.error(`Erreur lors de la suppression du message pour ${key}:`, error);
                });
            }
            if (callback) {
                callback();
            }
            this.cooldowns.delete(key);
        }, duration);

        this.cooldowns.set(key, {
            timer,
            message,
            callback,
            startTime: Date.now(),
            duration
        });
    }

    /**
     * Vérifie si un cooldown est actif
     */
    isOnCooldown(key: string): boolean {
        return this.cooldowns.has(key);
    }

    /**
     * Récupère le temps restant en millisecondes
     */
    getRemainingTime(key: string): number {
        const cooldown = this.cooldowns.get(key);
        if (!cooldown) return 0;

        const elapsed = Date.now() - cooldown.startTime;
        return Math.max(0, cooldown.duration - elapsed);
    }

    /**
     * Nettoie un cooldown spécifique
     */
    clearCooldown(key: string): void {
        const cooldown = this.cooldowns.get(key);
        if (cooldown) {
            clearTimeout(cooldown.timer);
            this.cooldowns.delete(key);
        }
    }

    /**
     * Nettoie tous les cooldowns
     */
    clearAll(): void {
        for (const [key] of this.cooldowns) {
            this.clearCooldown(key);
        }
    }

    /**
     * Nettoie tous les cooldowns d'un certain type
     * @param prefix Préfixe des clés à nettoyer (ex: 'game_' ou 'stats_')
     */
    clearByPrefix(prefix: string): void {
        for (const [key] of this.cooldowns) {
            if (key.startsWith(prefix)) {
                this.clearCooldown(key);
            }
        }
    }

    /**
     * Renouvelle un cooldown existant
     */
    renewCooldown(key: string): void {
        const cooldown = this.cooldowns.get(key);
        if (cooldown) {
            this.startCooldown(key, cooldown.duration, cooldown.callback, cooldown.message);
        }
    }
}

// Instance globale pour les cooldowns de jeu
export const gameCooldownManager = new CooldownManager();
// Instance globale pour les cooldowns de commandes
export const commandCooldownManager = new CooldownManager();
// Instance globale pour les cooldowns de messages
export const messageCooldownManager = new CooldownManager(); 