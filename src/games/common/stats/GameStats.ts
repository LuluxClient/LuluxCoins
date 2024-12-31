import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface GameStatsData {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesTied: number;
    totalWager: number;
    totalEarned: number;
}

export interface GameStats {
    global: GameStatsData;
    tictactoe: GameStatsData;
    connect4: GameStatsData;
    blackjack: GameStatsData;
}

export class GameStatsManager {
    private stats: Map<string, GameStats> = new Map();
    private readonly statsFile = join(process.cwd(), 'src', 'data', 'gameStats.json');
    private initialized = false;

    private createEmptyStats(): GameStatsData {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesTied: 0,
            totalWager: 0,
            totalEarned: 0
        };
    }

    private createEmptyGameStats(): GameStats {
        return {
            global: this.createEmptyStats(),
            tictactoe: this.createEmptyStats(),
            connect4: this.createEmptyStats(),
            blackjack: this.createEmptyStats()
        };
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await readFile(this.statsFile, 'utf-8');
            const jsonData = JSON.parse(data);
            
            // Convertir l'objet en Map
            for (const [userId, stats] of Object.entries(jsonData)) {
                this.stats.set(userId, stats as GameStats);
            }
        } catch (error) {
            // Si le fichier n'existe pas ou est invalide, on crée un nouveau fichier
            await this.saveToFile();
        }

        this.initialized = true;
    }

    private async saveToFile(): Promise<void> {
        try {
            // Convertir la Map en objet pour la sérialisation JSON
            const jsonData = Object.fromEntries(this.stats.entries());
            await writeFile(this.statsFile, JSON.stringify(jsonData, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des statistiques:', error);
        }
    }

    async getStats(userId: string): Promise<GameStats> {
        await this.initialize();

        let stats = this.stats.get(userId);
        if (!stats) {
            stats = this.createEmptyGameStats();
            this.stats.set(userId, stats);
            await this.saveToFile();
        }
        return stats;
    }

    async saveStats(userId: string, stats: GameStats): Promise<void> {
        await this.initialize();
        this.stats.set(userId, stats);
        await this.saveToFile();
    }
}

export const gameStats = new GameStatsManager(); 