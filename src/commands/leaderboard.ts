import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Voir le classement des utilisateurs')
    .addStringOption(option =>
        option
            .setName('currency')
            .setDescription('Type de monnaie à afficher')
            .setRequired(false)
            .addChoices(
                { name: 'LuluxCoins', value: 'luluxcoins' },
                { name: 'ZermiKoins', value: 'zermikoins' }
            ));

export async function execute(interaction: ChatInputCommandInteraction) {
    const currency = interaction.options.getString('currency') || 'luluxcoins';
    const currencyName = currency === 'luluxcoins' ? 'LuluxCoins' : 'ZermiKoins';
    const currencyEmoji = currency === 'luluxcoins' ? config.luluxcoinsEmoji : config.zermikoinsEmoji;

    try {
        const users = await db.getAllUsers();
        const sortedUsers = users.sort((a, b) => {
            const balanceA = currency === 'luluxcoins' ? a.balance : (a.zermikoins || 0);
            const balanceB = currency === 'luluxcoins' ? b.balance : (b.zermikoins || 0);
            return balanceB - balanceA;
        });

        const top10 = sortedUsers.slice(0, 10);
        let description = '';

        for (let i = 0; i < top10.length; i++) {
            const user = top10[i];
            const balance = currency === 'luluxcoins' ? user.balance : (user.zermikoins || 0);
            description += `${i + 1}. <@${user.userId}> - ${balance} ${currencyEmoji}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 Classement ${currencyName}`)
            .setDescription(description)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in leaderboard command:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la récupération du classement.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
} 