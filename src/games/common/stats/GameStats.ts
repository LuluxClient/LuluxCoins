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
        try {
            const stats = await this.getStats(userId);
            if (!stats) {
                throw new Error('Statistiques non trouvées');
            }

            const embed = this.createStatsEmbed(userId, stats);
            if (!message.channel) {
                throw new Error('Canal non trouvé');
            }

            const channel = message.channel as TextChannel;
            const newMessage = await channel.send({ embeds: [embed] });

            // Utiliser le messageCooldownManager pour gérer le timer
            messageCooldownManager.startCooldown(
                `stats_${userId}`,
                30000, // 30 secondes
                () => {
                    // Callback exécuté après le délai
                    if (newMessage) {
                        newMessage.delete().catch(error => {
                            console.error('Erreur lors de la suppression du message de stats:', error);
                        });
                    }
                }
            );
        } catch (error) {
            console.error('Erreur lors de l\'affichage des stats:', error);
            throw error;
        }
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
                    value: `Parties jouées: ${stats.global.gamesPlayed}\nVictoires: ${stats.global.gamesWon}\nDéfaites: ${stats.global.gamesLost}\nÉgalités: ${stats.global.gamesTied}\nMise totale: ${stats.global.totalWager} ${config.zermikoinsEmoji}\nGains totaux: ${stats.global.totalEarned} ${config.zermikoinsEmoji}`,
                    inline: false
                },
                {
                    name: '❌ Morpion',
                    value: `Parties jouées: ${stats.tictactoe.gamesPlayed}\nVictoires: ${stats.tictactoe.gamesWon}\nDéfaites: ${stats.tictactoe.gamesLost}\nÉgalités: ${stats.tictactoe.gamesTied}\nMise totale: ${stats.tictactoe.totalWager} ${config.zermikoinsEmoji}\nGains totaux: ${stats.tictactoe.totalEarned} ${config.zermikoinsEmoji}`,
                    inline: true
                },
                {
                    name: '🔴 Puissance 4',
                    value: `Parties jouées: ${stats.connect4.gamesPlayed}\nVictoires: ${stats.connect4.gamesWon}\nDéfaites: ${stats.connect4.gamesLost}\nÉgalités: ${stats.connect4.gamesTied}\nMise totale: ${stats.connect4.totalWager} ${config.zermikoinsEmoji}\nGains totaux: ${stats.connect4.totalEarned} ${config.zermikoinsEmoji}`,
                    inline: true
                },
                {
                    name: '🎲 Blackjack',
                    value: `Parties jouées: ${stats.blackjack.gamesPlayed}\nVictoires: ${stats.blackjack.gamesWon}\nDéfaites: ${stats.blackjack.gamesLost}\nÉgalités: ${stats.blackjack.gamesTied}\nMise totale: ${stats.blackjack.totalWager} ${config.zermikoinsEmoji}\nGains totaux: ${stats.blackjack.totalEarned} ${config.zermikoinsEmoji}`,
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
        try {
            const content = await readFile(this.statsFile, 'utf-8');
            const data = JSON.parse(content);
            
            // Ensure the data structure is correct
            if (!data.users) {
                data.users = {};
            }

            // Move any user data that's outside the users object
            for (const key in data) {
                if (key !== 'users' && typeof data[key] === 'object') {
                    if (!data.users[key]) {
                        data.users[key] = this.createEmptyUserStats();
                    }
                    // Merge the stats if they exist outside users
                    const outsideStats = data[key];
                    for (const gameType of ['global', 'tictactoe', 'connect4', 'blackjack']) {
                        if (outsideStats[gameType]) {
                            data.users[key][gameType] = {
                                ...this.createEmptyGameTypeStats(),
                                ...outsideStats[gameType]
                            };
                        }
                    }
                    delete data[key];
                }
            }

            // Ensure all users have all required game types
            for (const userId in data.users) {
                if (!data.users[userId].global) data.users[userId].global = this.createEmptyGameTypeStats();
                if (!data.users[userId].tictactoe) data.users[userId].tictactoe = this.createEmptyGameTypeStats();
                if (!data.users[userId].connect4) data.users[userId].connect4 = this.createEmptyGameTypeStats();
                if (!data.users[userId].blackjack) data.users[userId].blackjack = this.createEmptyGameTypeStats();
            }

            // Save the fixed structure back to file
            await this.saveToFile(data);
            return data;
        } catch (error) {
            console.error('Error reading stats file:', error);
            return this.createEmptyStats();
        }
    }

    private async saveToFile(data: GameStatsData): Promise<void> {
        await writeFile(this.statsFile, JSON.stringify(data, null, 2));
    }
}

export const gameStats = new GameStats(); 