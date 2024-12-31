import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, User } from 'discord.js';
import { TicTacToeGame } from '../types/TicTacToeTypes';
import { GameStatus } from '../../common/types/GameTypes';
import { TicTacToeLogic } from '../logic/TicTacToeLogic';
import { config } from '../../../config';

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
                    value: `${game.wager} ${config.luluxcoinsEmoji}`,
                    inline: true 
                },
                { 
                    name: 'Tour actuel', 
                    value: game.status === GameStatus.FINISHED 
                        ? (game.winner 
                            ? `🏆 ${game.winner.user instanceof User ? game.winner.user : 'LuluxBot'} a gagné ${game.wager > 0 ? `(+${game.wager * 2} ${config.luluxcoinsEmoji})` : ''}!` 
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
        
        if (game.status !== GameStatus.IN_PROGRESS) {
            return rows;
        }

        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 3; j++) {
                const position = i * 3 + j;
                const button = new ButtonBuilder()
                    .setCustomId(`tictactoe_${game.id}_${position}`)
                    .setStyle(this.getButtonStyle(game.board[position]))
                    .setLabel(this.getButtonLabel(game.board[position]))
                    .setDisabled(game.board[position] !== TicTacToeLogic.EMPTY_CELL);
                row.addComponents(button);
            }
            rows.push(row);
        }

        return rows;
    }

    static getButtonStyle(cell: string): ButtonStyle {
        switch (cell) {
            case TicTacToeLogic.EMPTY_CELL:
                return ButtonStyle.Secondary;
            case 'X':
                return ButtonStyle.Danger;
            case 'O':
                return ButtonStyle.Success;
            default:
                return ButtonStyle.Secondary;
        }
    }

    static getButtonLabel(cell: string): string {
        switch (cell) {
            case TicTacToeLogic.EMPTY_CELL:
                return '⬜';
            case 'X':
                return '❌';
            case 'O':
                return '⭕';
            default:
                return '⬜';
        }
    }
} 