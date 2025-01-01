import { User, Message, Client } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { BlackjackGame } from './types/BlackjackTypes';
import { GameStatus } from '../common/types/GameTypes';
import { BlackjackLogic } from './logic/BlackjackLogic';
import { BlackjackUI } from './ui/BlackjackUI';
import { gameStats } from '../common/stats/GameStats';
import { activeGamesManager } from '../common/managers/ActiveGamesManager';
import { replayManager } from '../common/managers/ReplayManager';
import { gameCooldownManager } from '../common/managers/CooldownManager';
import { db } from '../../database/databaseManager';

export class BlackjackManager {
    private games: Map<string, BlackjackGame> = new Map();
    private gameMessages: Map<string, Message> = new Map();
    private readonly GAME_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    private getUserId(user: User | 'LuluxBot'): string {
        return typeof user === 'string' ? user : user.id;
    }

    async createGame(player: User, wager: number): Promise<BlackjackGame> {
        const canStart = activeGamesManager.canStartGame([player]);
        if (!canStart.canStart) {
            throw new Error(canStart.error);
        }

        // Vérifier si le joueur a assez d'argent pour jouer
        const userData = await db.getUser(player.id);
        if (!userData || userData.balance < wager) {
            throw new Error('Vous n\'avez pas assez de LuluxCoins pour jouer !');
        }

        // Déduire la mise initiale
        await db.updateBalance(player.id, wager, 'remove');

        const id = uuidv4();
        const deck = BlackjackLogic.createDeck();
        const playerHand = BlackjackLogic.createEmptyHand();
        const dealerHand = BlackjackLogic.createEmptyHand();

        // Distribution initiale
        BlackjackLogic.addCardToHand(playerHand, BlackjackLogic.dealCard(deck));
        BlackjackLogic.addCardToHand(dealerHand, BlackjackLogic.dealCard(deck));
        BlackjackLogic.addCardToHand(playerHand, BlackjackLogic.dealCard(deck));
        BlackjackLogic.addCardToHand(dealerHand, BlackjackLogic.dealCard(deck));

        const game: BlackjackGame = {
            id,
            player: {
                user: player,
                hand: playerHand,
                splitHand: null
            },
            dealer: {
                hand: dealerHand,
                hiddenCard: true
            },
            deck,
            status: GameStatus.IN_PROGRESS,
            winner: null,
            wager,
            playerStands: false,
            canDouble: true,
            canSplit: BlackjackLogic.canSplit(playerHand),
            currentHand: 'main',
            lastMoveTimestamp: Date.now()
        };

        this.games.set(id, game);
        activeGamesManager.addGame(id, player, 'bot');

        return game;
    }

    addGameMessage(gameId: string, message: Message): void {
        this.gameMessages.set(gameId, message);
        const game = this.games.get(gameId);
        if (game) {
            this.updateGameMessage(game);
        }
    }

    async handleHit(gameId: string, playerId: string): Promise<void> {
        console.log(`[HIT] Début handleHit - GameId: ${gameId}, PlayerId: ${playerId}`);
        const game = this.games.get(gameId);
        if (!game) {
            console.log('[HIT] Jeu non trouvé');
            return;
        }

        if (game.status !== GameStatus.IN_PROGRESS || game.playerStands || 
            this.getUserId(game.player.user) !== playerId) {
            console.log('[HIT] Conditions invalides:', {
                status: game.status,
                playerStands: game.playerStands,
                playerId: this.getUserId(game.player.user)
            });
            return;
        }

        console.log('[HIT] Tirage d\'une carte');
        const card = BlackjackLogic.dealCard(game.deck);
        const currentHand = game.currentHand === 'main' ? game.player.hand : game.player.splitHand!;
        BlackjackLogic.addCardToHand(currentHand, card);
        console.log('[HIT] Nouvelle carte:', card);

        if (currentHand.value > 21) {
            if (game.player.splitHand && game.currentHand === 'main') {
                // Si on bust la première main en cas de split, passer à la deuxième
                game.currentHand = 'split';
                game.canDouble = true;
                await this.updateGameMessage(game);
            } else {
                // Sinon, fin de la partie
                console.log('[HIT] Joueur bust, fin de la partie');
                await this.endGame(game, 'dealer');
            }
        } else if (BlackjackLogic.shouldStopAtValue(currentHand)) {
            // Si on atteint 21, on passe automatiquement
            if (game.player.splitHand && game.currentHand === 'main') {
                game.currentHand = 'split';
                game.canDouble = true;
                await this.updateGameMessage(game);
            } else {
                game.playerStands = true;
                await this.playDealer(game);
            }
        } else {
            console.log('[HIT] Mise à jour des états du jeu');
            game.canDouble = false;
            game.canSplit = false;
            await this.updateGameMessage(game);
        }
        console.log('[HIT] Fin handleHit');
    }

    async handleStand(gameId: string, playerId: string): Promise<void> {
        console.log(`[STAND] Début handleStand - GameId: ${gameId}, PlayerId: ${playerId}`);
        const game = this.games.get(gameId);
        if (!game) {
            console.log('[STAND] Jeu non trouvé');
            return;
        }

        if (game.status !== GameStatus.IN_PROGRESS || 
            this.getUserId(game.player.user) !== playerId) {
            console.log('[STAND] Conditions invalides:', {
                status: game.status,
                playerId: this.getUserId(game.player.user)
            });
            return;
        }

        console.log('[STAND] Le joueur reste');
        
        if (game.player.splitHand && game.currentHand === 'main') {
            // Si on a splitté et qu'on est sur la première main, passer à la deuxième
            game.currentHand = 'split';
            game.canDouble = true;  // On peut doubler sur la deuxième main
            await this.updateGameMessage(game);
        } else {
            // Sinon, finir le tour du joueur
            game.playerStands = true;
            await this.playDealer(game);
        }
        console.log('[STAND] Fin handleStand');
    }

    async handleDouble(gameId: string, playerId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game || game.status !== GameStatus.IN_PROGRESS || game.playerStands || 
            this.getUserId(game.player.user) !== playerId || !game.canDouble) return;

        // Vérifier si le joueur a assez d'argent pour doubler
        const userData = await db.getUser(playerId);
        if (!userData || userData.balance < game.wager) {
            const message = this.gameMessages.get(gameId);
            if (message) {
                const reply = await message.reply({
                    content: 'Vous n\'avez pas assez de LuluxCoins pour doubler !'
                });
                setTimeout(() => reply.delete().catch(console.error), 30000);
            }
            return;
        }

        // Déduire la mise supplémentaire pour le double
        await db.updateBalance(playerId, game.wager, 'remove');

        console.log('[DOUBLE] Doublement de la mise');
        game.wager *= 2;

        console.log('[DOUBLE] Tirage d\'une carte');
        const card = BlackjackLogic.dealCard(game.deck);
        const currentHand = game.currentHand === 'main' ? game.player.hand : game.player.splitHand!;
        BlackjackLogic.addCardToHand(currentHand, card);
        console.log('[DOUBLE] Nouvelle carte:', card);

        if (currentHand.value > 21) {
            if (game.player.splitHand && game.currentHand === 'main') {
                // Si on bust la première main en cas de split, passer à la deuxième
                game.currentHand = 'split';
                game.canDouble = true;
                await this.updateGameMessage(game);
            } else {
                // Sinon, fin de la partie
                console.log('[DOUBLE] Joueur bust, fin de la partie');
                await this.endGame(game, 'dealer');
            }
        } else if (game.player.splitHand && game.currentHand === 'main') {
            // Si on a splitté et qu'on est sur la première main, passer à la deuxième
            game.currentHand = 'split';
            game.canDouble = true;
            await this.updateGameMessage(game);
        } else {
            // Sinon, finir le tour du joueur
            console.log('[DOUBLE] Le joueur reste, tour du croupier');
            game.playerStands = true;
            await this.playDealer(game);
        }
        console.log('[DOUBLE] Fin handleDouble');
    }

    async handleSplit(gameId: string, playerId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game || game.status !== GameStatus.IN_PROGRESS || game.playerStands || 
            this.getUserId(game.player.user) !== playerId || !game.canSplit) return;

        // Vérifier si le joueur a assez d'argent pour split
        const userData = await db.getUser(playerId);
        if (!userData || userData.balance < game.wager) {
            const message = this.gameMessages.get(gameId);
            if (message) {
                const reply = await message.reply({
                    content: 'Vous n\'avez pas assez de LuluxCoins pour split !'
                });
                setTimeout(() => reply.delete().catch(console.error), 30000);
            }
            return;
        }

        // Déduire la mise supplémentaire pour le split
        await db.updateBalance(playerId, game.wager, 'remove');

        // Créer la main splittée
        game.player.splitHand = BlackjackLogic.createEmptyHand();
        
        // Déplacer la deuxième carte vers la main splittée
        const secondCard = game.player.hand.cards.pop()!;
        BlackjackLogic.addCardToHand(game.player.splitHand, secondCard);

        // Tirer une nouvelle carte pour chaque main
        BlackjackLogic.addCardToHand(game.player.hand, BlackjackLogic.dealCard(game.deck));
        BlackjackLogic.addCardToHand(game.player.splitHand, BlackjackLogic.dealCard(game.deck));

        // Mettre à jour les états
        game.canSplit = false;
        game.canDouble = userData.balance >= game.wager; // Vérifier si on peut encore doubler
        game.wager *= 2; // Double la mise totale car on a deux mains

        await this.updateGameMessage(game);
    }

    private async playDealer(game: BlackjackGame): Promise<void> {
        console.log('[DEALER] Début du tour du croupier');
        
        // Révéler la carte cachée
        game.dealer.hiddenCard = false;
        await this.updateGameMessage(game);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Délai pour voir la carte cachée
        
        // Si le joueur a bust, pas besoin de jouer
        const currentHand = game.currentHand === 'main' ? game.player.hand : game.player.splitHand!;
        if (currentHand.value > 21) {
            console.log('[DEALER] Le joueur a bust, victoire du croupier');
            await this.endGame(game, 'dealer');
            return;
        }

        // Le croupier tire des cartes jusqu'à avoir au moins 17
        while (game.dealer.hand.value < 17) {
            console.log('[DEALER] Le croupier tire une carte');
            const card = BlackjackLogic.dealCard(game.deck);
            BlackjackLogic.addCardToHand(game.dealer.hand, card);
            await this.updateGameMessage(game);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Délai entre chaque carte
            console.log('[DEALER] Nouvelle carte:', card);
        }

        // Déterminer le gagnant
        if (game.dealer.hand.value > 21) {
            console.log('[DEALER] Le croupier a bust, victoire du joueur');
            await this.endGame(game, 'player');
        } else if (game.dealer.hand.value > currentHand.value) {
            console.log('[DEALER] Le croupier a une meilleure main');
            await this.endGame(game, 'dealer');
        } else if (game.dealer.hand.value < currentHand.value) {
            console.log('[DEALER] Le joueur a une meilleure main');
            await this.endGame(game, 'player');
        } else {
            console.log('[DEALER] Égalité');
            await this.endGame(game, 'tie');
        }
    }

    private async endGame(game: BlackjackGame, winner: 'player' | 'dealer' | 'tie'): Promise<void> {
        game.status = GameStatus.FINISHED;
        game.winner = winner;

        // Mise à jour des statistiques
        await this.updateGameStats(game);

        // Mise à jour du solde du joueur
        const playerId = this.getUserId(game.player.user);
        const baseWager = game.wager / (game.player.splitHand ? 2 : 1); // Mise par main

        if (winner === 'player') {
            if (game.player.splitHand) {
                // Cas du split
                let totalWinnings = 0;
                // Vérifier la main principale
                if (game.player.hand.value <= 21) {
                    if (game.player.hand.isNaturalBlackjack) {
                        totalWinnings += Math.floor(baseWager * 2.5);
                    } else {
                        totalWinnings += baseWager * 2;
                    }
                }
                // Vérifier la main splittée
                if (game.player.splitHand.value <= 21) {
                    if (game.player.splitHand.isNaturalBlackjack) {
                        totalWinnings += Math.floor(baseWager * 2.5);
                    } else {
                        totalWinnings += baseWager * 2;
                    }
                }
                if (totalWinnings > 0) {
                    await db.updateBalance(playerId, totalWinnings, 'add');
                }
            } else {
                // Cas normal
                if (game.player.hand.isNaturalBlackjack) {
                    const winnings = Math.floor(game.wager * 2.5);
                    await db.updateBalance(playerId, winnings, 'add');
                } else {
                    await db.updateBalance(playerId, game.wager * 2, 'add');
                }
            }
        } else if (winner === 'tie') {
            // En cas d'égalité, remboursement de la mise
            await db.updateBalance(playerId, game.wager, 'add');
        }
        // En cas de défaite, la mise est déjà perdue

        const message = this.gameMessages.get(game.id);
        if (message) {
            const embed = BlackjackUI.createGameEmbed(game);
            const replayButton = replayManager.createReplayButton(game.id, 'blackjack', game.wager);
            
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

    private async updateGameStats(game: BlackjackGame): Promise<void> {
        const stats = await gameStats.getStats(this.getUserId(game.player.user));

        // Mise à jour des statistiques de base
        stats.global.gamesPlayed++;
        stats.blackjack.gamesPlayed++;
        stats.global.totalWager += game.wager;
        stats.blackjack.totalWager += game.wager;

        // Calcul des gains en fonction du résultat
        if (game.winner === 'player') {
            stats.global.gamesWon++;
            stats.blackjack.gamesWon++;
            
            // Si c'est un blackjack naturel, le joueur gagne 2.5x sa mise
            if (game.player.hand.isNaturalBlackjack) {
                const winnings = Math.floor(game.wager * 2.5);
                stats.global.totalEarned += winnings;
                stats.blackjack.totalEarned += winnings;
            } else {
                // Sinon, le joueur gagne 2x sa mise
                stats.global.totalEarned += game.wager * 2;
                stats.blackjack.totalEarned += game.wager * 2;
            }
        } else if (game.winner === 'dealer') {
            stats.global.gamesLost++;
            stats.blackjack.gamesLost++;
            // Pas de gains quand on perd
        } else {
            // En cas d'égalité
            stats.global.gamesTied++;
            stats.blackjack.gamesTied++;
            // Le joueur récupère sa mise
            stats.global.totalEarned += game.wager;
            stats.blackjack.totalEarned += game.wager;
        }

        await gameStats.saveStats(this.getUserId(game.player.user), stats);
    }

    private startGameTimeout(game: BlackjackGame): void {
        setTimeout(() => {
            if (this.games.has(game.id) && game.status === GameStatus.IN_PROGRESS) {
                const timeSinceLastMove = Date.now() - game.lastMoveTimestamp;
                if (timeSinceLastMove >= this.GAME_TIMEOUT) {
                    this.endGame(game, 'dealer');
                } else {
                    this.startGameTimeout(game);
                }
            }
        }, this.GAME_TIMEOUT);
    }

    private async updateGameMessage(game: BlackjackGame): Promise<void> {
        console.log('[UPDATE] Début updateGameMessage');
        const message = this.gameMessages.get(game.id);
        if (!message) {
            console.log('[UPDATE] Message non trouvé');
            return;
        }

        try {
            console.log('[UPDATE] Création de l\'embed et des boutons');
            const embed = BlackjackUI.createGameEmbed(game);
            const buttons = BlackjackUI.createGameButtons(game);

            console.log('[UPDATE] Mise à jour du message');
            await message.edit({
                embeds: [embed],
                components: buttons
            });
            console.log('[UPDATE] Message mis à jour avec succès');
        } catch (error) {
            console.error('[UPDATE] Erreur lors de la mise à jour du message:', error);
        }
        console.log('[UPDATE] Fin updateGameMessage');
    }

    getGame(gameId: string): BlackjackGame | undefined {
        return this.games.get(gameId);
    }

    createGameEmbed(game: BlackjackGame) {
        return BlackjackUI.createGameEmbed(game);
    }

    createGameButtons(game: BlackjackGame) {
        return BlackjackUI.createGameButtons(game);
    }

    getGameMessage(gameId: string): Message | undefined {
        return this.gameMessages.get(gameId);
    }

    async handleReplay(gameId: string, playerId: string): Promise<void> {
        console.log('[DEBUG] Début handleReplay');
        const game = this.games.get(gameId);
        if (!game || game.status !== GameStatus.FINISHED) {
            console.log('[DEBUG] Partie non trouvée ou non terminée');
            return;
        }

        // Vérifier si le joueur a assez d'argent pour rejouer
        const userData = await db.getUser(playerId);
        if (!userData || userData.balance < game.wager) {
            console.log('[DEBUG] Pas assez d\'argent pour rejouer');
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
        const player = typeof game.player.user === 'string' ? 'bot' : game.player.user;
        console.log('[DEBUG] Création d\'une nouvelle partie');
        const newGame = await this.createGame(
            player === 'bot' ? game.player.user as User : player,
            game.wager
        );

        // Supprimer l'ancienne partie
        console.log('[DEBUG] Suppression de l\'ancienne partie');
        this.games.delete(gameId);
        const oldMessage = this.gameMessages.get(gameId);
        if (oldMessage) {
            this.gameMessages.delete(gameId);
            // Mettre à jour le message de l'ancienne partie pour indiquer qu'elle est terminée
            await oldMessage.edit({
                embeds: [BlackjackUI.createGameEmbed(game)],
                components: [] // Supprimer les boutons
            });
        }

        // Créer un nouveau message pour la nouvelle partie
        console.log('[DEBUG] Création du nouveau message');
        if (oldMessage) {
            const newMessage = await oldMessage.reply({
                embeds: [BlackjackUI.createGameEmbed(newGame)],
                components: BlackjackUI.createGameButtons(newGame)
            });
            this.gameMessages.set(newGame.id, newMessage);
            console.log('[DEBUG] Nouveau message créé avec succès');
        }
    }
}

export let blackjackManager: BlackjackManager;

export function initBlackjackManager(client: Client) {
    blackjackManager = new BlackjackManager(client);
} 