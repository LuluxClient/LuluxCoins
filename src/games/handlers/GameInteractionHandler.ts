import { ButtonInteraction } from 'discord.js';
import { ticTacToeManager } from '../tictactoe/TicTacToeManager';
import { connect4Manager } from '../connect4/Connect4Manager';
import { blackjackManager } from '../blackjack/BlackjackManager';
import { replayManager } from '../common/managers/ReplayManager';

export class GameInteractionHandler {
    static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        // Initialiser le client pour le ReplayManager
        replayManager.setClient(interaction.client);

        // Format: gameType_gameId_action
        const parts = interaction.customId.split('_');
        const gameType = parts[0];
        const gameId = parts[1];
        const action = parts[2];

        try {
            switch (gameType) {
                case 'tictactoe': {
                    const position = parseInt(action);
                    if (!isNaN(position)) {
                        await this.handleTicTacToeInteraction(interaction, position, gameId);
                    }
                    break;
                }
                case 'connect4': {
                    const column = parseInt(action);
                    if (!isNaN(column)) {
                        await this.handleConnect4Interaction(interaction, column, gameId);
                    }
                    break;
                }
                case 'blackjack':
                    await this.handleBlackjackInteraction(interaction, action, gameId);
                    break;
                case 'replay':
                    await this.handleReplayInteraction(interaction);
                    break;
            }
        } catch (error) {
            console.error('Erreur lors du traitement:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Une erreur est survenue lors du traitement de votre action.',
                    ephemeral: true
                });
            }
        }
    }

    private static async handleTicTacToeInteraction(interaction: ButtonInteraction, position: number, gameId: string): Promise<void> {
        const game = ticTacToeManager.getGame(gameId);
        if (!game) {
            await interaction.reply({
                content: 'Cette partie n\'existe plus.',
                ephemeral: true
            });
            return;
        }

        if (game.currentTurn !== interaction.user.id) {
            await interaction.reply({
                content: 'Ce n\'est pas votre tour !',
                ephemeral: true
            });
            return;
        }

        try {
            await interaction.deferUpdate();
            await ticTacToeManager.makeMove(gameId, position, interaction.user.id);
        } catch (error) {
            console.error('Erreur lors de l\'exécution du coup:', error);
        }
    }

    private static async handleConnect4Interaction(interaction: ButtonInteraction, column: number, gameId: string): Promise<void> {
        console.log('[CONNECT4] Vérification de la partie:', gameId);
        const game = connect4Manager.getGame(gameId);
        if (!game) {
            console.log('[CONNECT4] Partie non trouvée');
            await interaction.reply({
                content: 'Cette partie n\'existe plus.',
                ephemeral: true
            });
            return;
        }

        if (game.currentTurn !== interaction.user.id) {
            await interaction.reply({
                content: 'Ce n\'est pas votre tour !',
                ephemeral: true
            });
            return;
        }

        try {
            await interaction.deferUpdate();
            await connect4Manager.makeMove(gameId, column, interaction.user.id);
        } catch (error) {
            console.error('[CONNECT4] Erreur lors de l\'exécution du coup:', error);
        }
    }

    private static async handleBlackjackInteraction(interaction: ButtonInteraction, action: string, gameId: string): Promise<void> {
        console.log('[BLACKJACK] Vérification de la partie:', gameId);
        const game = blackjackManager.getGame(gameId);
        if (!game) {
            console.log('[BLACKJACK] Partie non trouvée');
            await interaction.reply({
                content: 'Cette partie n\'existe plus.',
                ephemeral: true
            });
            return;
        }

        // Vérifier si c'est bien le joueur qui joue
        const playerId = typeof game.player.user === 'string' ? game.player.user : game.player.user.id;
        if (playerId !== interaction.user.id) {
            await interaction.reply({
                content: 'Ce n\'est pas votre partie !',
                ephemeral: true
            });
            return;
        }

        console.log('[BLACKJACK] Exécution de l\'action:', action);
        try {
            await interaction.deferUpdate();
            
            switch (action) {
                case 'hit':
                    await blackjackManager.handleHit(gameId, interaction.user.id);
                    break;
                case 'stand':
                    await blackjackManager.handleStand(gameId, interaction.user.id);
                    break;
                case 'double':
                    await blackjackManager.handleDouble(gameId, interaction.user.id);
                    break;
                case 'split':
                    await blackjackManager.handleSplit(gameId, interaction.user.id);
                    break;
                default:
                    console.log('[BLACKJACK] Action non reconnue:', action);
            }
        } catch (error) {
            console.error('[BLACKJACK] Erreur lors de l\'exécution de l\'action:', error);
        }
    }

    private static async handleReplayInteraction(interaction: ButtonInteraction): Promise<void> {
        const [_, gameType, gameId, wager] = interaction.customId.split('_');
        await replayManager.handleReplayRequest(gameType, gameId, interaction.user.id, parseInt(wager));
        await interaction.deferUpdate();
    }
} 