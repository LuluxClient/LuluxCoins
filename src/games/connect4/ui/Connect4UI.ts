import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Connect4Game } from '../types/Connect4Types';
import { Connect4Logic } from '../logic/Connect4Logic';
import { GameStatus } from '../../common/types/GameTypes';

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
            { name: 'Joueur 2', value: `${player2Name} (${game.player2.symbol})`, inline: true }
        );

        if (game.wager > 0) {
            embed.addFields({ name: 'Mise', value: `${game.wager} 💰`, inline: true });
        }

        if (game.status === GameStatus.FINISHED) {
            if (game.winner) {
                const winnerName = game.winner.user === 'LuluxBot' ? 'LuluxBot' : `<@${game.winner.user.id}>`;
                embed.addFields({ 
                    name: 'Résultat', 
                    value: `🏆 ${winnerName} a gagné${game.wager > 0 ? ` et remporte ${game.wager * 2} 💰` : ''} !` 
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
        const row1 = new ActionRowBuilder<ButtonBuilder>();
        const row2 = new ActionRowBuilder<ButtonBuilder>();

        for (let col = 0; col < Connect4Logic.COLS; col++) {
            const button = new ButtonBuilder()
                .setCustomId(`connect4_${game.id}_${col}`)
                .setLabel(`${col + 1}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    game.status === GameStatus.FINISHED || 
                    !Connect4Logic.isValidMove(game.board, col) ||
                    (game.currentTurn === 'bot' && game.player2.user === 'LuluxBot')
                );

            // Répartir les boutons : 4 sur la première ligne, 3 sur la deuxième
            if (col < 4) {
                row1.addComponents(button);
            } else {
                row2.addComponents(button);
            }
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