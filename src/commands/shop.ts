import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../database/databaseManager';
import { EmbedCreator } from '../utils/embedBuilder';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View shop or buy items')
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('View available items in the shop')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('buy')
            .setDescription('Buy an item from the shop')
            .addStringOption(option =>
                option
                    .setName('item')
                    .setDescription('The item to purchase')
                    .setRequired(true)
                    .addChoices(
                        ...config.shopItems.map(item => ({
                            name: item.name,
                            value: item.id
                        }))
                    )
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
        const embed = EmbedCreator.createShopEmbed(config.shopItems);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    // Handle buy subcommand
    const itemId = interaction.options.getString('item', true);
    const item = config.shopItems.find(i => i.id === itemId);

    if (!item) {
        await interaction.reply({
            content: 'Invalid item selected!',
            ephemeral: true
        });
        return;
    }

    // Get user data
    const userData = db.getUser(interaction.user.id);
    if (!userData) {
        await interaction.reply({
            content: 'You are not registered in the database!',
            ephemeral: true
        });
        return;
    }

    // Check if user has enough coins
    if (userData.balance < item.price) {
        await interaction.reply({
            content: `You don't have enough coins to purchase this item! You need :luluxcoins: ${item.price} coins, but you only have :luluxcoins: ${userData.balance} coins.`,
            ephemeral: true
        });
        return;
    }

    // Process purchase
    await db.updateBalance(interaction.user.id, item.price, 'remove');
    await db.addTransaction({
        timestamp: Date.now(),
        type: 'purchase',
        userId: interaction.user.id,
        amount: item.price,
        itemName: item.name,
        currency: 'luluxcoins'
    });

    // Get updated user data
    const updatedUserData = db.getUser(interaction.user.id);
    const embed = EmbedCreator.createPurchaseEmbed(item, updatedUserData!);
    
    await interaction.reply({ embeds: [embed] });
} 