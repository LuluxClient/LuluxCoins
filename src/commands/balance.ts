import { 
    CommandInteraction, 
    SlashCommandBuilder,
    ChatInputCommandInteraction
} from 'discord.js';
import { db } from '../database/databaseManager';
import { EmbedCreator } from '../utils/embedBuilder';

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user\'s balance')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to check balance for')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userData = db.getUser(targetUser.id);

    if (!userData) {
        await interaction.reply({
            content: 'User not found in the database!',
            ephemeral: true
        });
        return;
    }

    const embed = EmbedCreator.createBalanceEmbed(userData);
    await interaction.reply({ 
        embeds: [embed],
        ephemeral: true
    });
} 