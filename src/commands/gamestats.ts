import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { gameStats } from '../games/common/stats/GameStats';

export const data = new SlashCommandBuilder()
    .setName('gamestats')
    .setDescription('Affiche les statistiques de jeu d\'un joueur')
    .addUserOption(option =>
        option.setName('joueur')
            .setDescription('Le joueur dont vous voulez voir les statistiques')
            .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('joueur') || interaction.user;
    const stats = await gameStats.getStats(targetUser.id);

    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle(`📊 Statistiques de ${targetUser.username}`)
        .addFields(
            {
                name: '🌐 Statistiques globales',
                value: [
                    `Parties jouées : ${stats.global.gamesPlayed}`,
                    `Victoires : ${stats.global.gamesWon}`,
                    `Défaites : ${stats.global.gamesLost}`,
                    `Égalités : ${stats.global.gamesTied}`,
                    `Total misé : ${stats.global.totalWager} 💰`,
                    `Total gagné : ${stats.global.totalEarned} 💰`
                ].join('\n'),
                inline: false
            },
            {
                name: '⭕ Morpion',
                value: [
                    `Parties jouées : ${stats.tictactoe.gamesPlayed}`,
                    `Victoires : ${stats.tictactoe.gamesWon}`,
                    `Défaites : ${stats.tictactoe.gamesLost}`,
                    `Égalités : ${stats.tictactoe.gamesTied}`,
                    `Total misé : ${stats.tictactoe.totalWager} 💰`,
                    `Total gagné : ${stats.tictactoe.totalEarned} 💰`
                ].join('\n'),
                inline: false
            },
            {
                name: '🔴 Puissance 4',
                value: [
                    `Parties jouées : ${stats.connect4.gamesPlayed}`,
                    `Victoires : ${stats.connect4.gamesWon}`,
                    `Défaites : ${stats.connect4.gamesLost}`,
                    `Égalités : ${stats.connect4.gamesTied}`,
                    `Total misé : ${stats.connect4.totalWager} 💰`,
                    `Total gagné : ${stats.connect4.totalEarned} 💰`
                ].join('\n'),
                inline: false
            }
        );

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Supprimer le message après 30 secondes
    setTimeout(() => {
        message.delete().catch(console.error);
    }, 30000);
} 