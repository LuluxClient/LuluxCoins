import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../database/databaseManager';
import { EmbedCreator } from '../utils/embedBuilder';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top users with the most Luluxcoins');

export async function execute(interaction: ChatInputCommandInteraction) {
    const users = db.getAllUsers();
    const embed = EmbedCreator.createLeaderboardEmbed(users);
    await interaction.reply({ embeds: [embed] });
} 