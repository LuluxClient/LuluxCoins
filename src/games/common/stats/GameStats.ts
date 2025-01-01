import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import { config } from '../../../config';
import { messageCooldownManager } from '../managers/CooldownManager';

interface GameStatsData {
    users: {
        [userId: string]: UserStats;
    };
}

interface UserStats {
    global: GameTypeStats;
    tictactoe: GameTypeStats;
    connect4: GameTypeStats;
    blackjack: GameTypeStats;
}

interface GameTypeStats {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesTied: number;
    totalWager: number;
    totalEarned: number;
}

export class GameStats {
    private readonly statsFile = join(process.cwd(), 'src', 'data', 'gameStats.json');
    private initialized = false;

    async displayStats(userId: string, message: Message): Promise<void> {
        const stats = await this.getStats(userId);
        const embed = this.createStatsEmbed(userId, stats);
        
        const channel = message.channel as TextChannel;
        const newMessage = await channel.send({ embeds: [embed] });

        // Utiliser le messageCooldownManager pour gérer le timer
        messageCooldownManager.startCooldown(
            `stats_${userId}`,
            30000, // 30 secondes
            undefined,
            newMessage
        );
    }

    async getStats(userId: string): Promise<UserStats> {
        await this.initialize();
        const data = await this.readFromFile();
        
        if (!data.users[userId]) {
            data.users[userId] = this.createEmptyUserStats();
            await this.saveToFile(data);
        }
        
        return data.users[userId];
    }

    async saveStats(userId: string, stats: UserStats): Promise<void> {
        const data = await this.readFromFile();
        data.users[userId] = stats;
        await this.saveToFile(data);
    }

    private createStatsEmbed(userId: string, stats: UserStats): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques de jeu')
            .setColor('#FFA500')
            .addFields(
                { 
                    name: '🎮 Global',
                    value: `Parties jouées: ${stats.global.gamesPlayed}\nVictoires: ${stats.global.gamesWon}\nDéfaites: ${stats.global.gamesLost}\nÉgalités: ${stats.global.gamesTied}\nMise totale: ${stats.global.totalWager} ${config.luluxcoinsEmoji}\nGains totaux: ${stats.global.totalEarned} ${config.luluxcoinsEmoji}`,
                    inline: false
                },
                {
                    name: '❌ Morpion',
                    value: `Parties jouées: ${stats.tictactoe.gamesPlayed}\nVictoires: ${stats.tictactoe.gamesWon}\nDéfaites: ${stats.tictactoe.gamesLost}\nÉgalités: ${stats.tictactoe.gamesTied}\nMise totale: ${stats.tictactoe.totalWager} ${config.luluxcoinsEmoji}\nGains totaux: ${stats.tictactoe.totalEarned} ${config.luluxcoinsEmoji}`,
                    inline: true
                },
                {
                    name: '🔴 Puissance 4',
                    value: `Parties jouées: ${stats.connect4.gamesPlayed}\nVictoires: ${stats.connect4.gamesWon}\nDéfaites: ${stats.connect4.gamesLost}\nÉgalités: ${stats.connect4.gamesTied}\nMise totale: ${stats.connect4.totalWager} ${config.luluxcoinsEmoji}\nGains totaux: ${stats.connect4.totalEarned} ${config.luluxcoinsEmoji}`,
                    inline: true
                },
                {
                    name: '🎲 Blackjack',
                    value: `Parties jouées: ${stats.blackjack.gamesPlayed}\nVictoires: ${stats.blackjack.gamesWon}\nDéfaites: ${stats.blackjack.gamesLost}\nÉgalités: ${stats.blackjack.gamesTied}\nMise totale: ${stats.blackjack.totalWager} ${config.luluxcoinsEmoji}\nGains totaux: ${stats.blackjack.totalEarned} ${config.luluxcoinsEmoji}`,
                    inline: true
                }
            );

        return embed;
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            await this.readFromFile();
        } catch (error) {
            const emptyData = this.createEmptyStats();
            await this.saveToFile(emptyData);
        }
        
        this.initialized = true;
    }

    private createEmptyStats(): GameStatsData {
        return {
            users: {}
        };
    }

    private createEmptyUserStats(): UserStats {
        return {
            global: this.createEmptyGameTypeStats(),
            tictactoe: this.createEmptyGameTypeStats(),
            connect4: this.createEmptyGameTypeStats(),
            blackjack: this.createEmptyGameTypeStats()
        };
    }

    private createEmptyGameTypeStats(): GameTypeStats {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesTied: 0,
            totalWager: 0,
            totalEarned: 0
        };
    }

    private async readFromFile(): Promise<GameStatsData> {
        const content = await readFile(this.statsFile, 'utf-8');
        return JSON.parse(content);
    }

    private async saveToFile(data: GameStatsData): Promise<void> {
        await writeFile(this.statsFile, JSON.stringify(data, null, 2));
    }
}

export const gameStats = new GameStats(); 