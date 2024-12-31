import { User } from 'discord.js';

export class ActiveGamesManager {
    private activeGames: Map<string, Set<string>> = new Map();

    addGame(gameId: string, player1: User, player2: User | 'bot'): void {
        const players = new Set<string>();
        players.add(player1.id);
        if (player2 !== 'bot') {
            players.add(player2.id);
        }
        this.activeGames.set(gameId, players);
    }

    removeGame(gameId: string): void {
        this.activeGames.delete(gameId);
    }

    canStartGame(players: (User | 'bot')[]): { canStart: boolean; error?: string } {
        const humanPlayers = players.filter(player => player !== 'bot') as User[];

        for (const player of humanPlayers) {
            for (const playerSet of this.activeGames.values()) {
                if (playerSet.has(player.id)) {
                    return {
                        canStart: false,
                        error: `<@${player.id}> est déjà dans une partie !`
                    };
                }
            }
        }

        return { canStart: true };
    }

    removeAllGamesForPlayer(player: User): void {
        const playerGames = Array.from(this.activeGames.entries())
            .filter(([_, players]) => 
                Array.from(players).some(p => p === player.id)
            );

        for (const [gameId] of playerGames) {
            this.removeGame(gameId);
        }
    }
}

export const activeGamesManager = new ActiveGamesManager(); 