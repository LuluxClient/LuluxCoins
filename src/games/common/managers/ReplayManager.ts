import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Message, TextChannel } from 'discord.js';
import { ticTacToeManager } from '../../tictactoe/TicTacToeManager';
import { connect4Manager } from '../../connect4/Connect4Manager';
import { blackjackManager } from '../../blackjack/BlackjackManager';
import { activeGamesManager } from '../managers/ActiveGamesManager';
import { gameCooldownManager } from './CooldownManager';

class ReplayManager {
    private client: Client | null = null;
    private replayRequests: Map<string, {
        gameType: 'tictactoe' | 'connect4' | 'blackjack',
        player1Id: string,
        player2Id?: string,
        wager: number,
        timestamp: number
    }> = new Map();

    setClient(client: Client) {
        this.client = client;
    }

    createReplayButton(gameType: string, gameId: string, wager: number) {
        console.log('[DEBUG] Création du bouton replay avec mise:', wager);
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`replay_${gameType}_${gameId}_${wager}`)
                .setLabel('REJOUER')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );
    }

    async handleReplayRequest(gameType: string, gameId: string, playerId: string, wager: number): Promise<void> {
        console.log('[REPLAY] Début handleReplayRequest:', { gameType, gameId, playerId, wager });
        if (!this.client) {
            console.log('[REPLAY] Client non initialisé');
            return;
        }
        
        try {
            console.log('[REPLAY] Récupération de l\'utilisateur');
            const player1 = await this.client.users.fetch(playerId);
            console.log('[REPLAY] Recherche de l\'ancien message');
            const oldMessage = await this.findGameMessage(gameId);
            if (!oldMessage) {
                console.log('[REPLAY] Ancien message non trouvé');
                return;
            }

            console.log('[REPLAY] Annulation du cooldown');
            gameCooldownManager.clearCooldown(`game_${gameId}`);

            console.log('[REPLAY] Suppression de l\'ancienne partie');
            activeGamesManager.removeGame(gameId);

            console.log('[REPLAY] Récupération du canal');
            const channel = oldMessage.channel as TextChannel;
            if (!channel) {
                console.log('[REPLAY] Canal non trouvé');
                return;
            }

            console.log('[REPLAY] Création de la nouvelle partie');
            let newGame;
            switch (gameType) {
                case 'tictactoe':
                    newGame = await ticTacToeManager.createGame(player1, 'bot', wager);
                    const newTicTacToeMessage = await channel.send({
                        embeds: [await ticTacToeManager.createGameEmbed(newGame)],
                        components: ticTacToeManager.createGameButtons(newGame)
                    });
                    ticTacToeManager.addGameMessage(newGame.id, newTicTacToeMessage);
                    break;
                case 'connect4':
                    newGame = await connect4Manager.createGame(player1, 'bot', wager);
                    const newConnect4Message = await channel.send({
                        embeds: [await connect4Manager.createGameEmbed(newGame)],
                        components: connect4Manager.createGameButtons(newGame)
                    });
                    connect4Manager.addGameMessage(newGame.id, newConnect4Message);
                    break;
                case 'blackjack':
                    newGame = await blackjackManager.createGame(player1, wager);
                    const newBlackjackMessage = await channel.send({
                        embeds: [blackjackManager.createGameEmbed(newGame)],
                        components: blackjackManager.createGameButtons(newGame)
                    });
                    blackjackManager.addGameMessage(newGame.id, newBlackjackMessage);
                    break;
            }

            console.log('[REPLAY] Suppression de l\'ancien message');
            try {
                await oldMessage.delete();
            } catch (error) {
                console.error('[REPLAY] Erreur lors de la suppression de l\'ancien message:', error);
            }

            console.log('[REPLAY] Replay terminé avec succès');
        } catch (error) {
            console.error('[REPLAY] Erreur lors de la gestion de la demande de replay:', error);
        }
    }

    private async findGameMessage(gameId: string): Promise<Message | null> {
        // Chercher le message dans les différents managers
        const message = 
            ticTacToeManager.getGameMessage(gameId) ||
            connect4Manager.getGameMessage(gameId) ||
            blackjackManager.getGameMessage(gameId);
        
        return message || null;
    }

    addReplayRequest(gameId: string, gameType: 'tictactoe' | 'connect4' | 'blackjack', player1Id: string, player2Id: string | undefined, wager: number): void {
        this.replayRequests.set(gameId, {
            gameType,
            player1Id,
            player2Id,
            wager,
            timestamp: Date.now()
        });

        // Supprimer la demande après 60 secondes
        setTimeout(() => {
            this.replayRequests.delete(gameId);
        }, 60000);
    }
}

export const replayManager = new ReplayManager(); 