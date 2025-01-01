import { ActionRowBuilder, ButtonBuilder, ButtonStyle, User, Message, Client, ButtonInteraction } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { Connect4Game, Connect4Player } from './types/Connect4Types';
import { GameStatus } from '../common/types/GameTypes';
import { Connect4Logic } from './logic/Connect4Logic';
import { Connect4UI } from './ui/Connect4UI';
import { gameStats } from '../common/stats/GameStats';
import { activeGamesManager } from '../common/managers/ActiveGamesManager';
import { replayManager } from '../common/managers/ReplayManager';
import { gameCooldownManager } from '../common/managers/CooldownManager';
import { db } from '../../database/databaseManager';

export class Connect4Manager {
    private games: Map<string, Connect4Game> = new Map();
    private gameMessages: Map<string, Message> = new Map();
    private readonly GAME_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async createGame(player1: User, player2: User | 'bot', wager: number): Promise<Connect4Game> {
        const canStart = activeGamesManager.canStartGame([player1]);
        if (!canStart.canStart) {
            throw new Error(canStart.error);
        }

        // Vérifier si le joueur a assez d'argent
        const player1Data = await db.getUser(player1.id);
        if (!player1Data || player1Data.balance < wager) {
            throw new Error(`${player1.username} n'a pas assez de LuluxCoins pour jouer !`);
        }
        
        // Déduire la mise du joueur 1
        await db.updateBalance(player1.id, wager, 'remove');

        const id = uuidv4();

        // Si c'est contre le bot, démarrer directement
        if (player2 === 'bot') {
            const startsFirst = Math.random() < 0.5;
            const game: Connect4Game = {
                id,
                player1: {
                    user: player1,
                    symbol: Connect4Logic.PLAYER_SYMBOLS[0]
                },
                player2: {
                    user: 'LuluxBot',
                    symbol: Connect4Logic.PLAYER_SYMBOLS[1]
                },
                board: Connect4Logic.createEmptyBoard(),
                currentTurn: startsFirst ? player1.id : 'bot',
                status: GameStatus.IN_PROGRESS,
                wager,
                winner: null,
                lastMoveTimestamp: Date.now()
            };

            this.games.set(id, game);
            activeGamesManager.addGame(id, player1, 'bot');

            // Si le bot commence, on le fait jouer après un court délai
            if (!startsFirst) {
                setTimeout(() => this.makeBotMove(game), 1500);
            }

            return game;
        }

        // Si c'est contre un joueur, créer une invitation
        const game: Connect4Game = {
            id,
            player1: {
                user: player1,
                symbol: Connect4Logic.PLAYER_SYMBOLS[0]
            },
            player2: {
                user: player2,
                symbol: Connect4Logic.PLAYER_SYMBOLS[1]
            },
            board: Connect4Logic.createEmptyBoard(),
            currentTurn: player1.id,
            status: GameStatus.WAITING_FOR_PLAYER,
            wager,
            winner: null,
            lastMoveTimestamp: Date.now()
        };

        this.games.set(id, game);
        activeGamesManager.addGame(id, player1, player2);

        // Supprimer l'invitation après 1 minute
        setTimeout(async () => {
            const gameToDelete = this.games.get(id);
            if (gameToDelete && gameToDelete.status === GameStatus.WAITING_FOR_PLAYER) {
                // Rembourser le joueur 1
                await db.updateBalance(player1.id, wager, 'add');
                
                // Supprimer le jeu
                this.games.delete(id);
                activeGamesManager.removeGame(id);
                
                // Supprimer le message
                const message = this.gameMessages.get(id);
                if (message) {
                    await message.delete().catch(console.error);
                    this.gameMessages.delete(id);
                }
            }
        }, 60000);

        return game;
    }

    addGameMessage(gameId: string, message: Message): void {
        this.gameMessages.set(gameId, message);
        // Ne pas mettre à jour le message immédiatement
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
        if (game.player2.user === 'LuluxBot') {
            const stats = await gameStats.getStats(this.getUserId(game.player1.user));
            
            stats.global.gamesPlayed++;
            stats.connect4.gamesPlayed++;
            
            if (game.wager > 0) {
                stats.global.totalWager += game.wager;
                stats.connect4.totalWager += game.wager;
                
                if (game.winner === game.player1) {
                    stats.global.gamesWon++;
                    stats.connect4.gamesWon++;
                    // Le joueur gagne 2x sa mise
                    stats.global.totalEarned += game.wager * 2;
                    stats.connect4.totalEarned += game.wager * 2;
                } else if (game.winner === game.player2) {
                    stats.global.gamesLost++;
                    stats.connect4.gamesLost++;
                    // Pas de gains en cas de défaite
                } else {
                    stats.global.gamesTied++;
                    stats.connect4.gamesTied++;
                    // Le joueur récupère sa mise en cas d'égalité
                    stats.global.totalEarned += game.wager;
                    stats.connect4.totalEarned += game.wager;
                }
            }
            
            await gameStats.saveStats(this.getUserId(game.player1.user), stats);
            return;
        }

        const stats = await gameStats.getStats(this.getUserId(game.player1.user));
        const stats2 = await gameStats.getStats(this.getUserId(game.player2.user));

        // Mise à jour des statistiques de base
        stats.global.gamesPlayed++;
        stats.connect4.gamesPlayed++;
        stats2.global.gamesPlayed++;
        stats2.connect4.gamesPlayed++;

        if (game.wager > 0) {
            stats.global.totalWager += game.wager;
            stats.connect4.totalWager += game.wager;
            stats2.global.totalWager += game.wager;
            stats2.connect4.totalWager += game.wager;
        }

        if (game.winner) {
            if (game.winner === game.player1) {
                stats.global.gamesWon++;
                stats.connect4.gamesWon++;
                stats2.global.gamesLost++;
                stats2.connect4.gamesLost++;
                
                if (game.wager > 0) {
                    // Le gagnant reçoit 2x sa mise
                    stats.global.totalEarned += game.wager * 2;
                    stats.connect4.totalEarned += game.wager * 2;
                }
            } else {
                stats.global.gamesLost++;
                stats.connect4.gamesLost++;
                stats2.global.gamesWon++;
                stats2.connect4.gamesWon++;
                
                if (game.wager > 0) {
                    // Le gagnant reçoit 2x sa mise
                    stats2.global.totalEarned += game.wager * 2;
                    stats2.connect4.totalEarned += game.wager * 2;
                }
            }
        } else {
            // En cas d'égalité
            stats.global.gamesTied++;
            stats.connect4.gamesTied++;
            stats2.global.gamesTied++;
            stats2.connect4.gamesTied++;
            
            if (game.wager > 0) {
                // Les deux joueurs récupèrent leur mise
                stats.global.totalEarned += game.wager;
                stats.connect4.totalEarned += game.wager;
                stats2.global.totalEarned += game.wager;
                stats2.connect4.totalEarned += game.wager;
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

    private async endGame(game: Connect4Game, winner: Connect4Player | null): Promise<void> {
        game.status = GameStatus.FINISHED;
        game.winner = winner;

        await this.updateGameStats(game);

        const message = this.gameMessages.get(game.id);
        if (message) {
            // Ajouter le bouton de replay
            const embed = Connect4UI.createGameEmbed(game);
            const replayButton = replayManager.createReplayButton(game.id, 'connect4', game.wager);
            
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

    async handleReplay(gameId: string, playerId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game || game.status !== GameStatus.FINISHED) return;

        // Vérifier si le joueur a assez d'argent pour rejouer
        const userData = await db.getUser(playerId);
        if (!userData || userData.balance < game.wager) {
            const message = this.gameMessages.get(gameId);
            if (message) {
                const reply = await message.reply({
                    content: 'Vous n\'avez pas assez de LuluxCoins pour rejouer !'
                });
                setTimeout(() => reply.delete().catch(console.error), 30000);
            }
            return;
        }

        // Créer une nouvelle partie avec les mêmes paramètres
        const player1 = typeof game.player1.user === 'string' ? 'bot' : game.player1.user;
        const player2 = typeof game.player2.user === 'string' ? 'bot' : game.player2.user;
        const newGame = await this.createGame(
            player1 === 'bot' ? game.player2.user as User : player1,
            player2 === 'bot' ? 'bot' : player2 as User,
            game.wager
        );

        // Mettre à jour le message avec la nouvelle partie
        const message = this.gameMessages.get(gameId);
        if (message) {
            const newMessage = await message.reply({
                embeds: [this.createGameEmbed(newGame)],
                components: this.createGameButtons(newGame)
            });
            this.gameMessages.set(newGame.id, newMessage);
        }
    }

    async handleAcceptGame(gameId: string, playerId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game || game.status !== GameStatus.WAITING_FOR_PLAYER) return;

        // Vérifier si le joueur a assez d'argent pour accepter la partie
        const userData = await db.getUser(playerId);
        if (!userData || userData.balance < game.wager) {
            const message = this.gameMessages.get(gameId);
            if (message) {
                const reply = await message.reply({
                    content: 'Vous n\'avez pas assez de LuluxCoins pour accepter la partie !'
                });
                setTimeout(() => reply.delete().catch(console.error), 30000);
            }
            return;
        }

        // Déduire la mise du joueur qui accepte
        await db.updateBalance(playerId, game.wager, 'remove');

        // Mettre à jour le statut de la partie
        game.status = GameStatus.IN_PROGRESS;
        game.player2 = {
            user: await this.client.users.fetch(playerId),
            symbol: Connect4Logic.PLAYER_SYMBOLS[1]
        };

        // Mettre à jour le message
        const message = this.gameMessages.get(game.id);
        if (message) {
            await message.edit({
                embeds: [this.createGameEmbed(game)],
                components: this.createGameButtons(game)
            });
        }
    }

    async handleInteraction(interaction: ButtonInteraction): Promise<void> {
        const [_, gameId, action] = interaction.customId.split('_');
        const game = this.games.get(gameId);

        if (!game) {
            await interaction.reply({ content: 'Cette partie n\'existe plus !', ephemeral: true });
            return;
        }

        // Gérer l'acceptation/refus de l'invitation
        if (game.status === GameStatus.WAITING_FOR_PLAYER) {
            if (interaction.user.id !== (game.player2.user as User).id) {
                await interaction.reply({ 
                    content: 'Vous ne pouvez pas répondre à cette invitation !', 
                    ephemeral: true 
                });
                return;
            }

            if (action === 'accept') {
                await this.handleAccept(game, interaction);
            } else if (action === 'decline') {
                await this.handleDecline(game, interaction);
            }
            return;
        }

        // Gérer les coups du jeu
        if (game.status !== GameStatus.IN_PROGRESS || game.currentTurn !== interaction.user.id) {
            await interaction.reply({ 
                content: 'Ce n\'est pas votre tour !', 
                ephemeral: true 
            });
            return;
        }

        const column = parseInt(action);
        if (isNaN(column) || column < 0 || column > 6 || !Connect4Logic.isValidMove(game.board, column)) {
            await interaction.reply({ 
                content: 'Coup invalide !', 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferUpdate();
        await this.makeMove(gameId, column, interaction.user.id);
    }

    private async handleAccept(game: Connect4Game, interaction: ButtonInteraction): Promise<void> {
        // Vérifier si le joueur 2 a assez d'argent
        if (game.wager > 0) {
            const player2Data = await db.getUser(interaction.user.id);
            if (!player2Data || player2Data.balance < game.wager) {
                await interaction.reply({ 
                    content: 'Vous n\'avez pas assez de LuluxCoins pour accepter cette partie !', 
                    ephemeral: true 
                });
                // Rembourser le joueur 1
                await db.updateBalance((game.player1.user as User).id, game.wager, 'add');
                this.games.delete(game.id);
                return;
            }
            // Déduire la mise du joueur 2
            await db.updateBalance(interaction.user.id, game.wager, 'remove');
        }

        // Démarrer la partie
        game.status = GameStatus.IN_PROGRESS;
        
        // Mettre à jour le message avec le plateau de jeu
        await interaction.update({ 
            content: null,
            embeds: [Connect4UI.createGameEmbed(game)],
            components: Connect4UI.createGameButtons(game)
        });
    }

    private async handleDecline(game: Connect4Game, interaction: ButtonInteraction): Promise<void> {
        // Rembourser le joueur 1
        if (game.wager > 0) {
            await db.updateBalance((game.player1.user as User).id, game.wager, 'add');
        }

        // Supprimer la partie
        this.games.delete(game.id);
        activeGamesManager.removeGame(game.id);

        await interaction.update({ 
            content: `${interaction.user.username} a refusé la partie !`,
            embeds: [],
            components: []
        });

        // Supprimer le message après 30 secondes
        setTimeout(() => {
            const message = this.gameMessages.get(game.id);
            if (message) {
                message.delete().catch(console.error);
                this.gameMessages.delete(game.id);
            }
        }, 30000);
    }
}

export let connect4Manager: Connect4Manager;

export function initConnect4Manager(client: Client) {
    connect4Manager = new Connect4Manager(client);
} 