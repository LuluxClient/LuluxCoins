import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, User, APIEmbed } from 'discord.js';
import { TicTacToeGame } from '../types/TicTacToeTypes';
import { GameStatus } from '../../common/types/GameTypes';
import { TicTacToeLogic } from '../logic/TicTacToeLogic';
import { config } from '../../../config';
import { db } from '../../../database/databaseManager';

export class TicTacToeUI {
    static async createGameEmbed(game: TicTacToeGame): Promise<APIEmbed> {
        // Récupérer les soldes des joueurs
        const player1Id = game.player1.user instanceof User ? game.player1.user.id : 'bot';
        const player2Id = game.player2.user instanceof User ? game.player2.user.id : 'bot';
        
        const [player1Data, player2Data] = await Promise.all([
            player1Id !== 'bot' ? db.getUser(player1Id) : null,
            player2Id !== 'bot' ? db.getUser(player2Id) : null
        ]);

        const player1Balance = player1Data?.balance ?? 0;
        const player2Balance = player2Data?.balance ?? 0;

        return {
            title: '🎮 Morpion',
            color: 0xFFA500,
            description: TicTacToeLogic.formatBoard(game.board),
            fields: [
                { 
                    name: 'Joueurs', 
                    value: `${game.player1.user instanceof User ? `${game.player1.user} (${player1Balance} ${config.luluxcoinsEmoji})` : 'LuluxBot'} (${game.player1.symbol}) VS ${game.player2.user instanceof User ? `${game.player2.user} (${player2Balance} ${config.luluxcoinsEmoji})` : 'LuluxBot'} (${game.player2.symbol})`,
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
            ]
        };
    }

    static createGameButtons(game: TicTacToeGame): ActionRowBuilder<ButtonBuilder>[] {
        if (game.status === GameStatus.WAITING_FOR_PLAYER) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_tictactoe_${game.id}`)
                    .setLabel('Accepter')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`decline_tictactoe_${game.id}`)
                    .setLabel('Refuser')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
            return [row];
        }

        if (game.status !== GameStatus.IN_PROGRESS) {
            return [];
        }

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 3; j++) {
                const position = i * 3 + j;
                const button = new ButtonBuilder()
                    .setCustomId(`move_tictactoe_${game.id}_${position}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(game.board[position])
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