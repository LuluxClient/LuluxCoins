import { User, Message } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { TicTacToeGame, TicTacToePlayer } from './types/TicTacToeTypes';
import { GameStatus } from '../common/types/GameTypes';
import { TicTacToeLogic } from './logic/TicTacToeLogic';
import { TicTacToeUI } from './ui/TicTacToeUI';
import { gameStats } from '../common/stats/GameStats';
import { activeGamesManager } from '../common/managers/ActiveGamesManager';
import { replayManager } from '../common/managers/ReplayManager';
import { gameCooldownManager } from '../common/managers/CooldownManager';

export class TicTacToeManager {
    private games: Map<string, TicTacToeGame> = new Map();
    private gameMessages: Map<string, Message> = new Map();

    async createGame(player1: User, player2: User | 'bot', wager: number): Promise<TicTacToeGame> {
        const canStart = activeGamesManager.canStartGame([player1, player2]);
        if (!canStart.canStart) {
            throw new Error(canStart.error);
        }

        const id = uuidv4();
        const startsFirst = Math.random() < 0.5;

        const game: TicTacToeGame = {
            id,
            player1: {
                user: player1,
                symbol: '❌'
            },
            player2: {
                user: player2 === 'bot' ? 'LuluxBot' : player2,
                symbol: '⭕'
            },
            board: Array(9).fill(TicTacToeLogic.EMPTY_CELL),
            currentTurn: startsFirst ? player1.id : (player2 === 'bot' ? 'bot' : player2.id),
            status: GameStatus.IN_PROGRESS,
            wager,
            winner: null
        };

        this.games.set(id, game);
        activeGamesManager.addGame(id, player1, player2);

        // Si le bot commence, on le fait jouer après un court délai
        if (player2 === 'bot' && !startsFirst) {
            setTimeout(() => this.makeBotMove(game), 1500);
        }

        return game;
    }

    addGameMessage(gameId: string, message: Message): void {
        this.gameMessages.set(gameId, message);
        const game = this.games.get(gameId);
        if (game) {
            // Mettre à jour immédiatement le message pour afficher le ping
            this.updateGameMessage(game);
        }
    }

    private cleanupGame(game: TicTacToeGame): void {
        // Supprimer immédiatement de la liste des parties actives
        activeGamesManager.removeGame(game.id);
        
        // Supprimer le message après 30 secondes
        const message = this.gameMessages.get(game.id);
        if (message) {
            setTimeout(() => {
                message.delete().catch(console.error);
                this.gameMessages.delete(game.id);
                this.games.delete(game.id);
            }, 30000);
        }
    }

    private getUserId(user: User | 'LuluxBot'): string {
        return user === 'LuluxBot' ? 'bot' : user.id;
    }

    async makeMove(gameId: string, position: number, playerId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) return;

        if (game.status !== GameStatus.IN_PROGRESS || game.currentTurn !== playerId) return;

        if (game.board[position] !== TicTacToeLogic.EMPTY_CELL) return;

        const currentPlayer = playerId === 'bot' ? game.player2 : 
            (playerId === this.getUserId(game.player1.user) ? game.player1 : game.player2);
        game.board[position] = currentPlayer.symbol;

        const winner = TicTacToeLogic.checkWinner(game.board);
        const isBoardFull = TicTacToeLogic.isBoardFull(game.board);

        if (winner || isBoardFull) {
            await this.endGame(game, winner ? currentPlayer : null);
        } else {
            if (currentPlayer === game.player1) {
                game.currentTurn = this.getUserId(game.player2.user);
            } else {
                game.currentTurn = this.getUserId(game.player1.user);
            }

            await this.updateGameMessage(game);

            if (game.player2.user === 'LuluxBot' && game.currentTurn === 'bot') {
                setTimeout(() => this.makeBotMove(game), 500);
            }
        }
    }

    async makeBotMove(game: TicTacToeGame): Promise<void> {
        if (game.status !== GameStatus.IN_PROGRESS || game.currentTurn !== 'bot') return;

        const botMove = TicTacToeLogic.getBotMove(game.board);
        if (botMove !== -1) {
            await this.makeMove(game.id, botMove, 'bot');
        }
    }

    private async updateGameMessage(game: TicTacToeGame): Promise<void> {
        const message = this.gameMessages.get(game.id);
        if (!message) return;

        const embed = TicTacToeUI.createGameEmbed(game);
        const buttons = TicTacToeUI.createGameButtons(game);

        try {
            const content = game.status === GameStatus.IN_PROGRESS && game.currentTurn !== 'bot'
                ? `<@${game.currentTurn}>, c'est ton tour !`
                : undefined;

            await message.edit({ 
                content,
                embeds: [embed], 
                components: buttons 
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du message:', error);
        }
    }

    private async updateGameStats(game: TicTacToeGame): Promise<void> {
        // Ne pas sauvegarder les stats contre le bot
        if (game.player2.user === 'LuluxBot') return;

        const stats = await gameStats.getStats(this.getUserId(game.player1.user));
        const stats2 = await gameStats.getStats(this.getUserId(game.player2.user));

        if (game.winner) {
            if (game.winner === game.player1) {
                stats.global.gamesWon++;
                stats.tictactoe.gamesWon++;
                stats2.global.gamesLost++;
                stats2.tictactoe.gamesLost++;
            } else {
                stats.global.gamesLost++;
                stats.tictactoe.gamesLost++;
                stats2.global.gamesWon++;
                stats2.tictactoe.gamesWon++;
            }
        } else {
            stats.global.gamesTied++;
            stats.tictactoe.gamesTied++;
            stats2.global.gamesTied++;
            stats2.tictactoe.gamesTied++;
        }

        stats.global.gamesPlayed++;
        stats.tictactoe.gamesPlayed++;
        stats2.global.gamesPlayed++;
        stats2.tictactoe.gamesPlayed++;

        if (game.wager > 0) {
            stats.global.totalWager += game.wager;
            stats.tictactoe.totalWager += game.wager;
            stats2.global.totalWager += game.wager;
            stats2.tictactoe.totalWager += game.wager;

            if (game.winner) {
                const winnings = game.wager * 2;
                if (game.winner === game.player1) {
                    stats.global.totalEarned += winnings;
                    stats.tictactoe.totalEarned += winnings;
                } else {
                    stats2.global.totalEarned += winnings;
                    stats2.tictactoe.totalEarned += winnings;
                }
            }
        }

        await gameStats.saveStats(this.getUserId(game.player1.user), stats);
        await gameStats.saveStats(this.getUserId(game.player2.user), stats2);
    }

    getGame(gameId: string): TicTacToeGame | undefined {
        return this.games.get(gameId);
    }

    createGameEmbed(game: TicTacToeGame) {
        return TicTacToeUI.createGameEmbed(game);
    }

    createGameButtons(game: TicTacToeGame) {
        return TicTacToeUI.createGameButtons(game);
    }

    private async endGame(game: TicTacToeGame, winner: TicTacToePlayer | null): Promise<void> {
        game.status = GameStatus.FINISHED;
        game.winner = winner;

        await this.updateGameStats(game);

        const message = this.gameMessages.get(game.id);
        if (message) {
            // Ajouter le bouton de replay
            const embed = TicTacToeUI.createGameEmbed(game);
            const replayButton = replayManager.createReplayButton(game.id, 'tictactoe');
            
            try {
                await message.edit({
                    embeds: [embed],
                    components: [replayButton]
                });

                // Utiliser le gameCooldownManager pour gérer le timer
                gameCooldownManager.startCooldown(
                    `game_${game.id}`,
                    30000, // 30 secondes
                    () => {
                        // Callback exécuté après le délai
                        this.gameMessages.delete(game.id);
                        this.games.delete(game.id);
                    },
                    message
                );
            } catch (error) {
                console.error('Erreur lors de la mise à jour du message final:', error);
            }
        }

        // Supprimer la partie de la liste des parties actives
        activeGamesManager.removeGame(game.id);
        this.games.delete(game.id);
    }

    getGameMessage(gameId: string): Message | undefined {
        return this.gameMessages.get(gameId);
    }
}

export const ticTacToeManager = new TicTacToeManager(); 