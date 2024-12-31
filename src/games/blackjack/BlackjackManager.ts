import { User, Message } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { BlackjackGame } from './types/BlackjackTypes';
import { GameStatus } from '../common/types/GameTypes';
import { BlackjackLogic } from './logic/BlackjackLogic';
import { BlackjackUI } from './ui/BlackjackUI';
import { gameStats } from '../common/stats/GameStats';
import { activeGamesManager } from '../common/managers/ActiveGamesManager';
import { replayManager } from '../common/managers/ReplayManager';

export class BlackjackManager {
    private games: Map<string, BlackjackGame> = new Map();
    private gameMessages: Map<string, Message> = new Map();
    private readonly GAME_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    private getUserId(user: User | 'LuluxBot'): string {
        return typeof user === 'string' ? user : user.id;
    }

    async createGame(player: User, wager: number): Promise<BlackjackGame> {
        const canStart = activeGamesManager.canStartGame([player]);
        if (!canStart.canStart) {
            throw new Error(canStart.error);
        }

        const id = uuidv4();
        const deck = BlackjackLogic.createDeck();
        const playerHand = BlackjackLogic.createEmptyHand();
        const dealerHand = BlackjackLogic.createEmptyHand();

        // Distribution initiale
        BlackjackLogic.addCardToHand(playerHand, BlackjackLogic.dealCard(deck));
        BlackjackLogic.addCardToHand(dealerHand, BlackjackLogic.dealCard(deck));
        BlackjackLogic.addCardToHand(playerHand, BlackjackLogic.dealCard(deck));
        const hiddenCard = BlackjackLogic.dealCard(deck);
        BlackjackLogic.addCardToHand(dealerHand, hiddenCard);

        const game: BlackjackGame = {
            id,
            player: {
                user: player,
                hand: playerHand,
                splitHand: null
            },
            dealer: {
                hand: dealerHand,
                hiddenCard
            },
            deck,
            status: GameStatus.IN_PROGRESS,
            wager,
            winner: null,
            lastMoveTimestamp: Date.now(),
            canDouble: BlackjackLogic.canDouble(playerHand),
            canSplit: BlackjackLogic.canSplit(playerHand),
            playerStands: false,
            currentHand: 'main'
        };

        this.games.set(id, game);
        activeGamesManager.addGame(id, player, 'bot');

        // Démarrer le timer de timeout
        this.startGameTimeout(game);

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
        console.log(`[DOUBLE] Début handleDouble - GameId: ${gameId}, PlayerId: ${playerId}`);
        const game = this.games.get(gameId);
        if (!game) {
            console.log('[DOUBLE] Jeu non trouvé');
            return;
        }

        if (game.status !== GameStatus.IN_PROGRESS || game.playerStands || 
            this.getUserId(game.player.user) !== playerId || !game.canDouble) {
            console.log('[DOUBLE] Conditions invalides:', {
                status: game.status,
                playerStands: game.playerStands,
                playerId: this.getUserId(game.player.user),
                canDouble: game.canDouble
            });
            return;
        }

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
        game.canDouble = true;
        game.wager *= 2; // Double la mise totale

        await this.updateGameMessage(game);
    }

    private async playDealer(game: BlackjackGame): Promise<void> {
        // Révéler la carte cachée
        game.dealer.hiddenCard = null;
        await this.updateGameMessage(game);
        
        // Attendre 1.5 secondes après la révélation de la carte cachée
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Le croupier tire des cartes jusqu'à 17 ou plus
        while (BlackjackLogic.shouldDealerHit(game.dealer.hand)) {
            const card = BlackjackLogic.dealCard(game.deck);
            BlackjackLogic.addCardToHand(game.dealer.hand, card);
            await this.updateGameMessage(game);
            
            // Attendre 1.5 secondes entre chaque carte
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const winner = BlackjackLogic.determineWinner(game.player.hand, game.dealer.hand);
        
        // Attendre 1 seconde avant d'afficher le résultat final
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.endGame(game, winner);
    }

    private async endGame(game: BlackjackGame, winner: 'player' | 'dealer' | 'push'): Promise<void> {
        console.log('[END] Début de endGame');
        game.status = GameStatus.FINISHED;
        game.winner = winner;

        await this.updateGameStats(game);
        await this.updateGameMessage(game);

        activeGamesManager.removeGame(game.id);
        this.games.delete(game.id);

        const message = this.gameMessages.get(game.id);
        if (message) {
            // Ajouter le bouton de replay
            const embed = BlackjackUI.createGameEmbed(game);
            const replayButton = replayManager.createReplayButton(game.id, 'blackjack');
            
            try {
                await message.edit({
                    embeds: [embed],
                    components: [replayButton]
                });

                // Supprimer le message après 30 secondes si personne n'a cliqué sur rejouer
                setTimeout(() => {
                    if (this.gameMessages.has(game.id)) {
                        message.delete().catch(() => {});
                        this.gameMessages.delete(game.id);
                    }
                }, 30000);
            } catch (error) {
                console.error('[END] Erreur lors de la mise à jour du message final:', error);
            }
        }
        console.log('[END] Fin de endGame');
    }

    private async updateGameStats(game: BlackjackGame): Promise<void> {
        const stats = await gameStats.getStats(this.getUserId(game.player.user));

        stats.global.gamesPlayed++;
        stats.blackjack.gamesPlayed++;
        stats.global.totalWager += game.wager;
        stats.blackjack.totalWager += game.wager;

        if (game.winner === 'player') {
            stats.global.gamesWon++;
            stats.blackjack.gamesWon++;
            stats.global.totalEarned += game.wager * 2;
            stats.blackjack.totalEarned += game.wager * 2;
        } else if (game.winner === 'dealer') {
            stats.global.gamesLost++;
            stats.blackjack.gamesLost++;
        } else {
            stats.global.gamesTied++;
            stats.blackjack.gamesTied++;
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
                    setTimeout(() => this.startGameTimeout(game), 
                        this.GAME_TIMEOUT - timeSinceLastMove);
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
}

export const blackjackManager = new BlackjackManager(); 