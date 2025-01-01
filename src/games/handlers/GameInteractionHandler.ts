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

            // Gérer le replay séparément car il a un format différent
            if (action === 'replay') {
                console.log('[DEBUG] Traitement d\'une action replay');
                const wager = parseInt(rest[0]);
                await replayManager.handleReplayRequest(gameType, gameId, interaction.user.id, wager);
                return;
            }

            // Gérer les autres actions de jeu
            switch (gameType) {
                case 'tictactoe': {
                    console.log('[DEBUG] Traitement d\'une action TicTacToe');
                    await ticTacToeManager.handleInteraction(interaction);
                    break;
                }
                case 'connect4': {
                    console.log('[DEBUG] Traitement d\'une action Connect4');
                    await connect4Manager.handleInteraction(interaction);
                    break;
                }
                case 'blackjack': {
                    console.log('[DEBUG] Traitement d\'une action Blackjack');
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