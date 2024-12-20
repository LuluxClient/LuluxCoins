import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';
import { EmbedCreator } from '../utils/embedBuilder';

export const data = new SlashCommandBuilder()
    .setName('luluxcoins')
    .setDescription('Manage user coins (Staff only)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add coins to a user')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to add coins to')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('amount')
                    .setDescription('Amount of coins to add')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remove coins from a user')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to remove coins from')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('amount')
                    .setDescription('Amount of coins to remove')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('set')
            .setDescription('Set a user\'s coins')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to set coins for')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('amount')
                    .setDescription('Amount of coins to set')
                    .setRequired(true)
                    .setMinValue(0)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const isOwner = interaction.user.id === config.ownerID;

    if (!isOwner) {
        await interaction.reply({
            content: 'Nique ta mère',
            ephemeral: true
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    // Register user if not in database
    await db.registerUser(targetUser.id, targetUser.username);

    switch (subcommand) {
        case 'add':
            await db.updateBalance(targetUser.id, amount, 'add');
            await db.addTransaction({
                timestamp: Date.now(),
                type: 'add',
                userId: targetUser.id,
                amount,
                executorId: interaction.user.id
            });
            const addEmbed = EmbedCreator.createLuluxcoinsActionEmbed(
                'add',
                interaction.user.username,
                targetUser.username,
                amount,
                db.getUser(targetUser.id)?.balance || 0
            );
            await interaction.reply({ embeds: [addEmbed] });
            break;

        case 'remove':
            await db.updateBalance(targetUser.id, amount, 'remove');
            await db.addTransaction({
                timestamp: Date.now(),
                type: 'remove',
                userId: targetUser.id,
                amount,
                executorId: interaction.user.id
            });
            const removeEmbed = EmbedCreator.createLuluxcoinsActionEmbed(
                'remove',
                interaction.user.username,
                targetUser.username,
                amount,
                db.getUser(targetUser.id)?.balance || 0
            );
            await interaction.reply({ embeds: [removeEmbed] });
            break;

        case 'set':
            await db.updateBalance(targetUser.id, amount, 'set');
            await db.addTransaction({
                timestamp: Date.now(),
                type: 'set',
                userId: targetUser.id,
                amount,
                executorId: interaction.user.id
            });
            break;
    }
} 