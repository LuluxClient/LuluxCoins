import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { gameStats } from '../games/common/stats/GameStats';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('gamestats')
    .setDescription('Affiche vos statistiques de jeu');

export async function execute(interaction: ChatInputCommandInteraction) {
    const stats = await gameStats.getStats(interaction.user.id);

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Statistiques de jeu')
        .setDescription(`Statistiques de <@${interaction.user.id}>`)
        .addFields(
            { 
                name: '🎮 Global', 
                value: `Parties jouées: ${stats.global.gamesPlayed}\n` +
                       `Victoires: ${stats.global.gamesWon}\n` +
                       `Défaites: ${stats.global.gamesLost}\n` +
                       `Égalités: ${stats.global.gamesTied}\n` +
                       `Total misé: ${stats.global.totalWager} ${config.luluxcoinsEmoji}\n` +
                       `Total gagné: ${stats.global.totalEarned} ${config.luluxcoinsEmoji}`,
                inline: false 
            },
            { 
                name: '⭕ Morpion', 
                value: `Parties jouées: ${stats.tictactoe.gamesPlayed}\n` +
                       `Victoires: ${stats.tictactoe.gamesWon}\n` +
                       `Défaites: ${stats.tictactoe.gamesLost}\n` +
                       `Égalités: ${stats.tictactoe.gamesTied}\n` +
                       `Total misé: ${stats.tictactoe.totalWager} ${config.luluxcoinsEmoji}\n` +
                       `Total gagné: ${stats.tictactoe.totalEarned} ${config.luluxcoinsEmoji}`,
                inline: true 
            },
            { 
                name: '🔵 Puissance 4', 
                value: `Parties jouées: ${stats.connect4.gamesPlayed}\n` +
                       `Victoires: ${stats.connect4.gamesWon}\n` +
                       `Défaites: ${stats.connect4.gamesLost}\n` +
                       `Égalités: ${stats.connect4.gamesTied}\n` +
                       `Total misé: ${stats.connect4.totalWager} ${config.luluxcoinsEmoji}\n` +
                       `Total gagné: ${stats.connect4.totalEarned} ${config.luluxcoinsEmoji}`,
                inline: true 
            },
            { 
                name: '🎰 Blackjack', 
                value: `Parties jouées: ${stats.blackjack.gamesPlayed}\n` +
                       `Victoires: ${stats.blackjack.gamesWon}\n` +
                       `Défaites: ${stats.blackjack.gamesLost}\n` +
                       `Égalités: ${stats.blackjack.gamesTied}\n` +
                       `Total misé: ${stats.blackjack.totalWager} ${config.luluxcoinsEmoji}\n` +
                       `Total gagné: ${stats.blackjack.totalEarned} ${config.luluxcoinsEmoji}`,
                inline: true 
            }
        );

    await interaction.reply({ embeds: [embed] });
} 