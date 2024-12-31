import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, User } from 'discord.js';
import { TicTacToeGame } from '../types/TicTacToeTypes';
import { GameStatus } from '../../common/types/GameTypes';
import { TicTacToeLogic } from '../logic/TicTacToeLogic';

export class TicTacToeUI {
    static createGameEmbed(game: TicTacToeGame): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Morpion')
            .setColor('#FFA500')
            .setDescription(TicTacToeLogic.formatBoard(game.board))
            .addFields(
                { 
                    name: 'Joueurs', 
                    value: `${game.player1.user instanceof User ? game.player1.user : 'LuluxBot'} (${game.player1.symbol}) VS ${game.player2.user instanceof User ? game.player2.user : 'LuluxBot'} (${game.player2.symbol})`,
                    inline: false 
                },
                { 
                    name: 'Mise', 
                    value: game.wager > 0 ? `${game.wager} 💰` : 'Aucune mise',
                    inline: true 
                },
                { 
                    name: 'Tour actuel', 
                    value: game.status === GameStatus.FINISHED 
                        ? (game.winner 
                            ? `🏆 ${game.winner.user instanceof User ? game.winner.user : 'LuluxBot'} a gagné ${game.wager > 0 ? `(+${game.wager * 2} 💰)` : ''}!` 
                            : '🤝 Match nul !')
                        : game.currentTurn === 'bot' 
                            ? 'LuluxBot'
                            : `<@${game.currentTurn}>`,
                    inline: true 
                }
            );

        return embed;
    }

    static createGameButtons(game: TicTacToeGame): ActionRowBuilder<ButtonBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 3; j++) {
                const position = i * 3 + j;
                const cell = game.board[position];
                
                const button = new ButtonBuilder()
                    .setCustomId(`tictactoe_${game.id}_${position}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(cell === TicTacToeLogic.EMPTY_CELL ? '⬜' : cell)
                    .setDisabled(
                        game.status !== GameStatus.IN_PROGRESS || 
                        cell !== TicTacToeLogic.EMPTY_CELL
                    );
                
                row.addComponents(button);
            }
            rows.push(row);
        }
        
        return rows;
    }
} 