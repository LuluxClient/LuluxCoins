import { User, Message } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { Connect4Game, Connect4Player } from './types/Connect4Types';
import { GameStatus } from '../common/types/GameTypes';
import { Connect4Logic } from './logic/Connect4Logic';
import { Connect4UI } from './ui/Connect4UI';
import { gameStats } from '../common/stats/GameStats';
import { activeGamesManager } from '../common/managers/ActiveGamesManager';

export class Connect4Manager {
    private games: Map<string, Connect4Game> = new Map();
    private gameMessages: Map<string, Message> = new Map();
    private readonly GAME_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    async createGame(player1: User, player2: User | 'bot', wager: number): Promise<Connect4Game> {
        const canStart = activeGamesManager.canStartGame([player1, player2]);
        if (!canStart.canStart) {
            throw new Error(canStart.error);
        }

        const id = uuidv4();
        const startsFirst = Math.random() < 0.5;

        const game: Connect4Game = {
            id,
            player1: {
                user: player1,
                symbol: Connect4Logic.PLAYER_SYMBOLS[0]
            },
            player2: {
                user: player2 === 'bot' ? 'LuluxBot' : player2,
                symbol: Connect4Logic.PLAYER_SYMBOLS[1]
            },
            board: Connect4Logic.createEmptyBoard(),
            currentTurn: startsFirst ? player1.id : (player2 === 'bot' ? 'bot' : player2.id),
            status: GameStatus.IN_PROGRESS,
            wager,
            winner: null,
            lastMoveTimestamp: Date.now()
        };

        this.games.set(id, game);
        activeGamesManager.addGame(id, player1, player2);

        // Démarrer le timer de timeout
        this.startGameTimeout(game);

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
            this.updateGameMessage(game);
        }
    }

    private getUserId(user: User | 'LuluxBot'): string {
        return user === 'LuluxBot' ? 'bot' : user.id;
    }

    async makeMove(gameId: string, column: number, playerId: string): Promise<void> {
        try {
            const game = this.games.get(gameId);
            if (!game) {
                return;
            }

            if (game.status !== GameStatus.IN_PROGRESS || game.currentTurn !== playerId) {
                return;
            }

            if (!Connect4Logic.isValidMove(game.board, column)) {
                return;
            }

            const row = Connect4Logic.getNextAvailableRow(game.board, column);
            if (row === -1) {
                return;
            }

            const currentPlayer = playerId === 'bot' ? game.player2 : 
                (playerId === this.getUserId(game.player1.user) ? game.player1 : game.player2);
            
            game.board[row][column] = currentPlayer.symbol;
            game.lastMoveTimestamp = Date.now();

            const hasWinner = Connect4Logic.checkWinner(game.board);
            const isBoardFull = Connect4Logic.isBoardFull(game.board);

            if (hasWinner || isBoardFull) {
                game.status = GameStatus.FINISHED;
                if (hasWinner) {
                    game.winner = currentPlayer;
                }
                await this.updateGameStats(game);
                await this.updateGameMessage(game);
                
                activeGamesManager.removeGame(game.id);
                this.games.delete(game.id);

                const message = this.gameMessages.get(game.id);
                if (message) {
                    setTimeout(() => {
                        message.delete().catch(() => {});
                        this.gameMessages.delete(game.id);
                    }, 30000);
                }
            } else {
                if (currentPlayer === game.player1) {
                    game.currentTurn = this.getUserId(game.player2.user);
                } else {
                    game.currentTurn = this.getUserId(game.player1.user);
                }

                await this.updateGameMessage(game);

                if (game.player2.user === 'LuluxBot' && game.currentTurn === 'bot') {
                    setTimeout(() => this.makeBotMove(game), 1500);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution du coup:', error);
        }
    }

    async makeBotMove(game: Connect4Game): Promise<void> {
        try {
            if (game.status !== GameStatus.IN_PROGRESS || game.currentTurn !== 'bot') return;

            const botMove = Connect4Logic.getBotMove(game.board);
            
            if (botMove !== -1) {
                await this.makeMove(game.id, botMove, 'bot');
            }
        } catch (error) {
            console.error('Erreur lors du coup du bot:', error);
        }
    }

    private startGameTimeout(game: Connect4Game): void {
        setTimeout(() => {
            if (this.games.has(game.id) && game.status === GameStatus.IN_PROGRESS) {
                const timeSinceLastMove = Date.now() - game.lastMoveTimestamp;
                if (timeSinceLastMove >= this.GAME_TIMEOUT) {
                    game.status = GameStatus.FINISHED;
                    this.updateGameMessage(game);
                    
                    // Supprimer immédiatement la partie de la liste des parties actives
                    activeGamesManager.removeGame(game.id);
                    this.games.delete(game.id);

                    // Supprimer le message après 30 secondes
                    const message = this.gameMessages.get(game.id);
                    if (message) {
                        setTimeout(() => {
                            message.delete().catch(console.error);
                            this.gameMessages.delete(game.id);
                        }, 30000);
                    }
                } else {
                    // Vérifier à nouveau dans le temps restant
                    setTimeout(() => this.startGameTimeout(game), 
                        this.GAME_TIMEOUT - timeSinceLastMove);
                }
            }
        }, this.GAME_TIMEOUT);
    }

    private async updateGameMessage(game: Connect4Game): Promise<void> {
        const message = this.gameMessages.get(game.id);
        if (!message) return;

        try {
            const embed = Connect4UI.createGameEmbed(game);
            const buttons = Connect4UI.createGameButtons(game);

            const content = game.status === GameStatus.IN_PROGRESS && game.currentTurn !== 'bot'
                ? `<@${game.currentTurn}>, c'est ton tour !`
                : '';

            await message.edit({ 
                content,
                embeds: [embed], 
                components: buttons 
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du message:', error);
        }
    }

    private async updateGameStats(game: Connect4Game): Promise<void> {
        // Ne pas sauvegarder les stats contre le bot
        if (game.player2.user === 'LuluxBot') return;

        const stats = await gameStats.getStats(this.getUserId(game.player1.user));
        const stats2 = await gameStats.getStats(this.getUserId(game.player2.user));

        if (game.winner) {
            if (game.winner === game.player1) {
                stats.global.gamesWon++;
                stats.connect4.gamesWon++;
                stats2.global.gamesLost++;
                stats2.connect4.gamesLost++;
            } else {
                stats.global.gamesLost++;
                stats.connect4.gamesLost++;
                stats2.global.gamesWon++;
                stats2.connect4.gamesWon++;
            }
        } else {
            stats.global.gamesTied++;
            stats.connect4.gamesTied++;
            stats2.global.gamesTied++;
            stats2.connect4.gamesTied++;
        }

        stats.global.gamesPlayed++;
        stats.connect4.gamesPlayed++;
        stats2.global.gamesPlayed++;
        stats2.connect4.gamesPlayed++;

        if (game.wager > 0) {
            stats.global.totalWager += game.wager;
            stats.connect4.totalWager += game.wager;
            stats2.global.totalWager += game.wager;
            stats2.connect4.totalWager += game.wager;

            if (game.winner) {
                const winnings = game.wager * 2;
                if (game.winner === game.player1) {
                    stats.global.totalEarned += winnings;
                    stats.connect4.totalEarned += winnings;
                } else {
                    stats2.global.totalEarned += winnings;
                    stats2.connect4.totalEarned += winnings;
                }
            }
        }

        await gameStats.saveStats(this.getUserId(game.player1.user), stats);
        await gameStats.saveStats(this.getUserId(game.player2.user), stats2);
    }

    getGame(gameId: string): Connect4Game | undefined {
        return this.games.get(gameId);
    }

    createGameEmbed(game: Connect4Game) {
        return Connect4UI.createGameEmbed(game);
    }

    createGameButtons(game: Connect4Game) {
        return Connect4UI.createGameButtons(game);
    }
}

export const connect4Manager = new Connect4Manager(); 