import { ButtonInteraction } from 'discord.js';
import { ticTacToeManager } from '../tictactoe/TicTacToeManager';
import { connect4Manager } from '../connect4/Connect4Manager';
import { blackjackManager } from '../blackjack/BlackjackManager';
import { replayManager } from '../common/managers/ReplayManager';

export class GameInteractionHandler {
    static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        try {
            console.log('[DEBUG] Interaction reçue:', {
                customId: interaction.customId,
                user: interaction.user.username,
                isDeferred: interaction.deferred,
                isReplied: interaction.replied
            });

            const [action, gameType, gameId, ...rest] = interaction.customId.split('_');
            console.log('[DEBUG] Parsed interaction:', { action, gameType, gameId, rest });

            try {
                // Toujours accuser réception de l'interaction immédiatement
                await interaction.deferUpdate();
                console.log('[DEBUG] Interaction déférée avec succès');
            } catch (error) {
                console.error('[DEBUG] Erreur lors du deferUpdate:', error);
                return;
            }

            // Gérer les actions de jeu
            switch (gameType) {
                case 'tictactoe': {
                    console.log('[DEBUG] Traitement d\'une action TicTacToe');
                    if (action === 'replay') {
                        await ticTacToeManager.handleReplay(gameId, interaction.user.id);
                        return;
                    }

                    const game = ticTacToeManager.getGame(gameId);
                    if (!game) {
                        console.log('[DEBUG] Partie TicTacToe non trouvée');
                        await interaction.followUp({
                            content: 'Cette partie n\'existe plus !',
                            ephemeral: true
                        });
                        return;
                    }

                    if (action === 'accept' || action === 'decline') {
                        await ticTacToeManager.handleInteraction(interaction);
                    } else if (action === 'move') {
                        const position = parseInt(rest[0]);
                        if (!isNaN(position)) {
                            await ticTacToeManager.makeMove(gameId, position, interaction.user.id);
                        }
                    }
                    break;
                }
                case 'connect4': {
                    console.log('[DEBUG] Traitement d\'une action Connect4');
                    if (action === 'replay') {
                        await connect4Manager.handleReplay(gameId, interaction.user.id);
                        return;
                    }

                    const game = connect4Manager.getGame(gameId);
                    if (!game) {
                        console.log('[DEBUG] Partie Connect4 non trouvée');
                        await interaction.followUp({
                            content: 'Cette partie n\'existe plus !',
                            ephemeral: true
                        });
                        return;
                    }

                    if (action === 'accept' || action === 'decline') {
                        await connect4Manager.handleInteraction(interaction);
                    } else if (action === 'move') {
                        const column = parseInt(rest[0]);
                        if (!isNaN(column)) {
                            await connect4Manager.makeMove(gameId, column, interaction.user.id);
                        }
                    }
                    break;
                }
                case 'blackjack': {
                    console.log('[DEBUG] Traitement d\'une action Blackjack');
                    if (action === 'replay') {
                        console.log('[DEBUG] Traitement du replay Blackjack');
                        await blackjackManager.handleReplay(gameId, interaction.user.id);
                        return;
                    }

                    const game = blackjackManager.getGame(gameId);
                    if (!game) {
                        console.log('[DEBUG] Partie Blackjack non trouvée');
                        await interaction.followUp({
                            content: 'Cette partie n\'existe plus !',
                            ephemeral: true
                        });
                        return;
                    }

                    const playerId = typeof game.player.user === 'string' ? game.player.user : game.player.user.id;
                    if (playerId !== interaction.user.id) {
                        console.log('[DEBUG] Utilisateur non autorisé');
                        await interaction.followUp({
                            content: 'Ce n\'est pas votre partie !',
                            ephemeral: true
                        });
                        return;
                    }

                    console.log('[DEBUG] Exécution de l\'action Blackjack:', action);
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
            console.error('[DEBUG] Erreur lors du traitement:', error);
            try {
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
            } catch (followUpError) {
                console.error('[DEBUG] Erreur lors de l\'envoi du message d\'erreur:', followUpError);
            }
        }
    }
} 