import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../database/databaseManager';
import { EmbedCreator } from '../utils/embedBuilder';

export const data = new SlashCommandBuilder()
    .setName('history')
    .setDescription('View transaction history')
    .addIntegerOption(option =>
        option
            .setName('page')
            .setDescription('Page number to view')
            .setMinValue(1)
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const transactions = db.getTransactions();

    if (transactions.length === 0) {
        await interaction.reply({
            content: 'No transactions found in the history!',
            ephemeral: true
        });
        return;
    }

    // Sort transactions by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    const maxPage = Math.ceil(transactions.length / 10);
    let page = interaction.options.getInteger('page') || 1;
    
    // Ensure page is within valid range
    if (page > maxPage) {
        await interaction.reply({
            content: `Invalid page number! Maximum page is ${maxPage}.`,
            ephemeral: true
        });
        return;
    }

    const embed = EmbedCreator.createTransactionHistoryEmbed(transactions, page);
    await interaction.reply({ embeds: [embed] });
} 