import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, User, APIEmbed } from 'discord.js';
import { Connect4Game } from '../types/Connect4Types';
import { Connect4Logic } from '../logic/Connect4Logic';
import { GameStatus } from '../../common/types/GameTypes';
import { config } from '../../../config';
import { db } from '../../../database/databaseManager';

export class Connect4UI {
    static async createGameEmbed(game: Connect4Game): Promise<APIEmbed> {
        // Récupérer les soldes des joueurs
        const player1Id = game.player1.user instanceof User ? game.player1.user.id : 'bot';
        const player2Id = game.player2.user instanceof User ? game.player2.user.id : 'bot';
        
        const [player1Data, player2Data] = await Promise.all([
            player1Id !== 'bot' ? db.getUser(player1Id) : null,
            player2Id !== 'bot' ? db.getUser(player2Id) : null
        ]);

        const player1Balance = player1Data?.zermikoins ?? 0;
        const player2Balance = player2Data?.zermikoins ?? 0;

        return {
            title: '🎮 Puissance 4',
            color: 0xFFA500,
            description: this.formatBoard(game.board),
            fields: [
                { 
                    name: 'Joueurs', 
                    value: `${game.player1.user instanceof User ? `${game.player1.user} (${player1Balance} ${config.zermikoinsEmoji})` : 'LuluxBot'} (${game.player1.symbol}) VS ${game.player2.user instanceof User ? `${game.player2.user} (${player2Balance} ${config.zermikoinsEmoji})` : 'LuluxBot'} (${game.player2.symbol})`,
                    inline: false 
                },
                { 
                    name: 'Mise', 
                    value: `${game.wager} ${config.zermikoinsEmoji}`,
                    inline: true 
                },
                { 
                    name: 'Tour actuel', 
                    value: game.status === GameStatus.FINISHED 
                        ? (game.winner 
                            ? `🏆 ${game.winner.user instanceof User ? game.winner.user : 'LuluxBot'} a gagné ${game.wager > 0 ? `(+${game.wager * 2} ${config.zermikoinsEmoji})` : ''}!` 
                            : '🤝 Match nul !')
                        : game.currentTurn === 'bot' 
                            ? 'LuluxBot'
                            : `<@${game.currentTurn}>`,
                    inline: true 
                }
            ]
        };
    }

    static createGameButtons(game: Connect4Game): ActionRowBuilder<ButtonBuilder>[] {
        // Si on attend que le joueur accepte, montrer les boutons d'acceptation/refus
        if (game.status === GameStatus.WAITING_FOR_PLAYER) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_connect4_${game.id}`)
                    .setLabel('Accepter')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`decline_connect4_${game.id}`)
                    .setLabel('Refuser')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
            return [row];
        }

        // Si la partie est terminée, retourner un tableau vide
        if (game.status !== GameStatus.IN_PROGRESS) {
            return [];
        }

        // Créer deux rangées de boutons
        const row1 = new ActionRowBuilder<ButtonBuilder>();
        const row2 = new ActionRowBuilder<ButtonBuilder>();

        // Emojis des numéros
        const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

        // Ajouter les 5 premiers boutons à la première rangée
        for (let i = 0; i < 5; i++) {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_connect4_${game.id}_${i}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(numbers[i])
                    .setDisabled(!Connect4Logic.isValidMove(game.board, i))
            );
        }

        // Ajouter les 2 derniers boutons à la deuxième rangée
        for (let i = 5; i < 7; i++) {
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_connect4_${game.id}_${i}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(numbers[i])
                    .setDisabled(!Connect4Logic.isValidMove(game.board, i))
            );
        }

        return [row1, row2];
    }

    private static formatBoard(board: string[][]): string {
        // Utiliser des caractères plus grands pour le plateau
        const EMPTY = '⬜';  // Case vide blanche
        const RED = '🔴';    // Jeton rouge
        const YELLOW = '🟡'; // Jeton jaune
        
        // Convertir les symboles du jeu en emojis plus grands
        const convertedBoard = board.map(row => 
            row.map(cell => {
                if (cell === Connect4Logic.EMPTY_CELL) return EMPTY;
                if (cell === Connect4Logic.PLAYER_SYMBOLS[0]) return RED;
                return YELLOW;
            })
        );

        // Ajouter des espaces entre les cellules pour plus de lisibilité
        return convertedBoard.map(row => row.join(' ')).join('\n') + '\n' + 
               ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'].join(' ');
    }
} 