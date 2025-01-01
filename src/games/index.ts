import { ButtonInteraction, Client } from 'discord.js';
import { ticTacToeManager } from './tictactoe/TicTacToeManager';
import { connect4Manager } from './connect4/Connect4Manager';
import { initTicTacToeManager } from './tictactoe/TicTacToeManager';
import { initConnect4Manager } from './connect4/Connect4Manager';
import { initBlackjackManager } from './blackjack/BlackjackManager';

// Types communs
export * from './common/types/GameTypes';

// Gestionnaires communs
export { messageManager } from './common/messages/MessageManager';
export { gameStats } from './common/stats/GameStats';
export { activeGamesManager } from './common/managers/ActiveGamesManager';

// TicTacToe
export { ticTacToeManager } from './tictactoe/TicTacToeManager';
export * from './tictactoe/types/TicTacToeTypes';

// Connect 4
export { connect4Manager } from './connect4/Connect4Manager';
export * from './connect4/types/Connect4Types';

// Gestionnaire d'interactions pour les jeux
export async function handleGameInteraction(interaction: ButtonInteraction): Promise<void> {
    const [gameType, gameId, action] = interaction.customId.split('_');

    try {
        if (gameType === 'tictactoe') {
            const game = ticTacToeManager.getGame(gameId);
            if (!game) {
                await interaction.reply({ content: 'Cette partie n\'existe plus.', ephemeral: true });
                return;
            }

            if (game.currentTurn !== interaction.user.id) {
                await interaction.reply({ content: 'Ce n\'est pas ton tour !', ephemeral: true });
                return;
            }

            await ticTacToeManager.makeMove(gameId, parseInt(action), interaction.user.id);
            await interaction.deferUpdate();

        } else if (gameType === 'connect4') {
            const game = connect4Manager.getGame(gameId);
            if (!game) {
                await interaction.reply({ content: 'Cette partie n\'existe plus.', ephemeral: true });
                return;
            }

            if (game.currentTurn !== interaction.user.id) {
                await interaction.reply({ content: 'Ce n\'est pas ton tour !', ephemeral: true });
                return;
            }

            await connect4Manager.makeMove(gameId, parseInt(action), interaction.user.id);
            await interaction.deferUpdate();
        }
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Une erreur est survenue !', ephemeral: true });
    }
}

export function initGameManagers(client: Client) {
    initTicTacToeManager(client);
    initConnect4Manager(client);
    initBlackjackManager(client);
} 