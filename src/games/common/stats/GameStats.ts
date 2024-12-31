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
}

export class GameStatsManager {
    private readonly statsPath = join(__dirname, '..', '..', '..', 'data', 'gameStats.json');

    private async initStatsFile(): Promise<void> {
        try {
            await readFile(this.statsPath);
        } catch {
            await writeFile(this.statsPath, JSON.stringify({}, null, 2));
        }
    }

    private getDefaultStats(): GameStats {
        const defaultData: GameStatsData = {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesTied: 0,
            totalWager: 0,
            totalEarned: 0
        };

        return {
            global: { ...defaultData },
            tictactoe: { ...defaultData },
            connect4: { ...defaultData }
        };
    }

    async getStats(userId: string): Promise<GameStats> {
        await this.initStatsFile();
        const content = await readFile(this.statsPath, 'utf-8');
        const stats = JSON.parse(content);
        return stats[userId] || this.getDefaultStats();
    }

    async saveStats(userId: string, stats: GameStats): Promise<void> {
        await this.initStatsFile();
        const content = await readFile(this.statsPath, 'utf-8');
        const allStats = JSON.parse(content);
        allStats[userId] = stats;
        await writeFile(this.statsPath, JSON.stringify(allStats, null, 2));
    }
}

export const gameStats = new GameStatsManager(); 