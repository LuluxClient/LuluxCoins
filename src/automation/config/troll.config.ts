import { TrollConfig } from '../types/AutomationType';

export const trollConfig: TrollConfig = {
    // Paramètres globaux
    global: {
        startingChance: 0,              // Chance de départ
        maxBaseChance: 0.4,             // 40% max de chance de base
        minBaseChance: 0,               // 0% min de chance de base
        maxTotalChance: 0.8,            // 80% max au total
        dailyDecay: 0.05,               // -5% par jour d'inactivité
        activityBonus: 0.02,            // +2% par jour d'activité
        streakBonus: 0.01,              // +1% par jour de streak
        activityTimeout: 86400000,      // 24h pour considérer comme inactif
        globalCooldown: 1800000,        // 30 minutes entre chaque troll
        checkInterval: 300000,          // 5 minutes entre chaque vérification
    },

    // Bonus temporaires
    temporaryBonuses: {
        inVoiceChat: 0.2,              // +20% en vocal
        recentMessages: 0.1,           // +10% si messages récents
        voiceTime: 0.1,               // +10% si temps vocal suffisant
        minMessages: 5,               // Nombre minimum de messages
        minVoiceTime: 300000,        // 5 minutes minimum en vocal
    },

    // Configuration spécifique par action
    actions: {
        discussion: {
            cooldown: 3600000,         // 1 heure
            requiredChance: 1,         // 100% requis
            minRecentMessages: 5,      // 5 messages minimum
            recentMessageWindow: 120000, // Dans les 2 dernières minutes
            questionTimeout: 60000,    // 60 secondes pour répondre
            hintInterval: 20000,       // 20 secondes entre les indices
        },
        channelRoulette: {
            cooldown: 300000,          // 5 minutes
            requiredChance: 0.3,       // 30% minimum
            returnDelay: 6000,         // 6 secondes avant retour
        },
        multiPing: {
            cooldown: 600000,          // 10 minutes
            requiredChance: 0.4,       // 40% minimum
            deleteDelay: 100,          // 0.1 seconde avant suppression
        },
        randomLocalSound: {
            cooldown: 180000,          // 3 minutes
            requiredChance: 0.2,       // 20% minimum
        },
        youtubeSound: {
            cooldown: 300000,          // 5 minutes
            requiredChance: 0.25,      // 25% minimum
        },
        tempChannelNames: {
            cooldown: 900000,          // 15 minutes
            requiredChance: 0.5,       // 50% minimum
            duration: 300000,          // 5 minutes de renommage
        },
        surpriseAI: {
            cooldown: 300000,          // 5 minutes
            requiredChance: 0.35,      // 35% minimum
        },
        forceNickname: {
            cooldown: 14400000,        // 4 heures
            requiredChance: 0.6,       // 60% minimum
            duration: 14400000,        // 4 heures de surnom forcé
        }
    }
}; 