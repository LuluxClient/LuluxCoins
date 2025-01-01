import { ButtonInteraction } from 'discord.js';
import { ticTacToeManager } from '../tictactoe/TicTacToeManager';
import { connect4Manager } from '../connect4/Connect4Manager';
import { blackjackManager } from '../blackjack/BlackjackManager';
import { replayManager } from '../common/managers/ReplayManager';

export class GameInteractionHandler {
    static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        try {
            const [action, gameType, gameId, ...rest] = interaction.customId.split('_');

            // Toujours accuser réception de l'interaction immédiatement
            await interaction.deferUpdate();

            // Gérer le replay séparément car il a un format différent
            if (action === 'replay') {
                const wager = parseInt(rest[0]);
                await replayManager.handleReplayRequest(gameType, gameId, interaction.user.id, wager);
                return;
            }

            // Gérer les autres actions de jeu
            switch (gameType) {
                case 'tictactoe': {
                    await ticTacToeManager.handleInteraction(interaction);
                    break;
                }
                case 'connect4': {
                    await connect4Manager.handleInteraction(interaction);
                    break;
                }
                case 'blackjack': {
                    const game = blackjackManager.getGame(gameId);
                    if (!game) {
                        await interaction.followUp({
                            content: 'Cette partie n\'existe plus !',
                            ephemeral: true
                        });
                        return;
                    }

                    const playerId = typeof game.player.user === 'string' ? game.player.user : game.player.user.id;
                    if (playerId !== interaction.user.id) {
                        await interaction.followUp({
                            content: 'Ce n\'est pas votre partie !',
                            ephemeral: true
                        });
                        return;
                    }

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
            }
        } catch (error) {
            console.error('Erreur lors du traitement:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Une erreur est survenue lors du traitement de votre action.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: 'Une erreur est survenue lors du traitement de votre action.',
                    ephemeral: true
                });
            }
        }
    }
} 