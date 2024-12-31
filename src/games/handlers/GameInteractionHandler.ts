import { ButtonInteraction } from 'discord.js';
import { GameStatus } from '../common/types/GameTypes';
import { ticTacToeManager } from '../tictactoe/TicTacToeManager';
import { connect4Manager } from '../connect4/Connect4Manager';

export class GameInteractionHandler {
    static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        // Handle TicTacToe buttons
        if (interaction.customId.startsWith('tictactoe_')) {
            await this.handleTicTacToeButton(interaction);
            return;
        }

        // Handle Connect4 buttons
        if (interaction.customId.startsWith('connect4_')) {
            await this.handleConnect4Button(interaction);
            return;
        }
    }

    private static async handleTicTacToeButton(interaction: ButtonInteraction): Promise<void> {
        try {
            const [_, gameId, positionStr] = interaction.customId.split('_');
            const position = parseInt(positionStr);
            
            const game = ticTacToeManager.getGame(gameId);
            if (!game) {
                await interaction.reply({ content: 'Cette partie n\'existe plus.', ephemeral: true });
                return;
            }

            if (game.currentTurn !== interaction.user.id) {
                await interaction.reply({ content: 'Ce n\'est pas ton tour !', ephemeral: true });
                return;
            }

            await ticTacToeManager.makeMove(gameId, position, interaction.user.id);
            await interaction.deferUpdate();

        } catch (error) {
            await interaction.reply({
                content: `❌ ${error instanceof Error ? error.message : 'Une erreur est survenue'}`,
                ephemeral: true
            });
        }
    }

    private static async handleConnect4Button(interaction: ButtonInteraction): Promise<void> {
        try {
            const [_, gameId, columnStr] = interaction.customId.split('_');
            const column = parseInt(columnStr);
            
            const game = connect4Manager.getGame(gameId);
            if (!game) {
                await interaction.reply({ content: 'Cette partie n\'existe plus.', ephemeral: true });
                return;
            }

            if (game.currentTurn !== interaction.user.id) {
                await interaction.reply({ content: 'Ce n\'est pas ton tour !', ephemeral: true });
                return;
            }

            await connect4Manager.makeMove(gameId, column, interaction.user.id);
            await interaction.deferUpdate();

        } catch (error) {
            await interaction.reply({
                content: `❌ ${error instanceof Error ? error.message : 'Une erreur est survenue'}`,
                ephemeral: true
            });
        }
    }
} 