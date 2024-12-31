import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Connect4Game } from '../types/Connect4Types';
import { Connect4Logic } from '../logic/Connect4Logic';
import { GameStatus } from '../../common/types/GameTypes';
import { config } from '../../../config';

export class Connect4UI {
    static createGameEmbed(game: Connect4Game): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Puissance 4')
            .setDescription(this.formatBoard(game.board));

        const player1Name = game.player1.user === 'LuluxBot' ? 'LuluxBot' : `<@${game.player1.user.id}>`;
        const player2Name = game.player2.user === 'LuluxBot' ? 'LuluxBot' : `<@${game.player2.user.id}>`;

        embed.addFields(
            { name: 'Joueur 1', value: `${player1Name} (${game.player1.symbol})`, inline: true },
            { name: 'Joueur 2', value: `${player2Name} (${game.player2.symbol})`, inline: true },
            { name: 'Mise', value: `${game.wager} ${config.luluxcoinsEmoji}`, inline: true }
        );

        if (game.status === GameStatus.FINISHED) {
            if (game.winner) {
                const winnerName = game.winner.user === 'LuluxBot' ? 'LuluxBot' : `<@${game.winner.user.id}>`;
                embed.addFields({ 
                    name: 'Résultat', 
                    value: `🏆 ${winnerName} a gagné${game.wager > 0 ? ` et remporte ${game.wager * 2} ${config.luluxcoinsEmoji}` : ''} !` 
                });
            } else {
                embed.addFields({ name: 'Résultat', value: '🤝 Match nul !' });
            }
        } else {
            const currentPlayerName = game.currentTurn === 'bot' ? 'LuluxBot' : `<@${game.currentTurn}>`;
            embed.addFields({ name: 'Tour actuel', value: `${currentPlayerName}` });
        }

        return embed;
    }

    static createGameButtons(game: Connect4Game): ActionRowBuilder<ButtonBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        
        // Si la partie est terminée, ne pas afficher les boutons
        if (game.status !== GameStatus.IN_PROGRESS) {
            return rows;
        }

        // Créer une rangée de 7 boutons pour les colonnes
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let col = 0; col < 7; col++) {
            const button = new ButtonBuilder()
                .setCustomId(`connect4_${game.id}_${col}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬇️')
                .setDisabled(!Connect4Logic.isValidMove(game.board, col));
            row.addComponents(button);
        }
        rows.push(row);

        return rows;
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