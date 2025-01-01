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
        const [gameType, gameId, action] = interaction.customId.split('_');

        try {
            switch (gameType) {
                case 'tictactoe': {
                    if (action === 'accept' || action === 'decline') {
                        await ticTacToeManager.handleInteraction(interaction);
                    } else {
                        const position = parseInt(action);
                        if (!isNaN(position)) {
                            await ticTacToeManager.handleInteraction(interaction);
                        }
                    }
                    break;
                }
                case 'connect4': {
                    if (action === 'accept' || action === 'decline') {
                        await connect4Manager.handleInteraction(interaction);
                    } else {
                        const column = parseInt(action);
                        if (!isNaN(column)) {
                            await connect4Manager.handleInteraction(interaction);
                        }
                    }
                    break;
                }
                case 'blackjack': {
                    const game = blackjackManager.getGame(gameId);
                    if (!game) {
                        await interaction.reply({
                            content: 'Cette partie n\'existe plus !',
                            ephemeral: true
                        });
                        return;
                    }

                    const playerId = typeof game.player.user === 'string' ? game.player.user : game.player.user.id;
                    if (playerId !== interaction.user.id) {
                        await interaction.reply({
                            content: 'Ce n\'est pas votre partie !',
                            ephemeral: true
                        });
                        return;
                    }

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
                    }
                    break;
                }
                case 'replay':
                    await replayManager.handleReplayRequest(gameType, gameId, interaction.user.id, parseInt(action));
                    await interaction.deferUpdate();
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
} 