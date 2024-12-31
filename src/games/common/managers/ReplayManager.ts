import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } from 'discord.js';
import { ticTacToeManager } from '../../tictactoe/TicTacToeManager';
import { connect4Manager } from '../../connect4/Connect4Manager';
import { blackjackManager } from '../../blackjack/BlackjackManager';
import { activeGamesManager } from '../managers/ActiveGamesManager';

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

    createReplayButton(gameId: string, gameType: 'tictactoe' | 'connect4' | 'blackjack'): ActionRowBuilder<ButtonBuilder> {
        const replayButton = new ButtonBuilder()
            .setCustomId(`replay_${gameType}_${gameId}`)
            .setLabel('REJOUER')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');

        return new ActionRowBuilder<ButtonBuilder>().addComponents(replayButton);
    }

    async handleReplayRequest(gameType: string, gameId: string, playerId: string): Promise<void> {
        if (!this.client) return;
        
        try {
            const player1 = await this.client.users.fetch(playerId);

            // Ne supprimer que la partie spécifique qui est rejouée
            activeGamesManager.removeGame(gameId);

            // Si c'est contre le bot, on relance directement
            switch (gameType) {
                case 'tictactoe':
                    await ticTacToeManager.createGame(player1, 'bot', 0);
                    break;
                case 'connect4':
                    await connect4Manager.createGame(player1, 'bot', 0);
                    break;
                case 'blackjack':
                    await blackjackManager.createGame(player1, 0);
                    break;
            }
        } catch (error) {
            console.error('Erreur lors de la gestion de la demande de replay:', error);
        }
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