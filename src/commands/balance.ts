import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Voir son solde ou celui d\'un autre utilisateur')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('L\'utilisateur dont tu veux voir le solde')
            .setRequired(false))
    .addStringOption(option =>
        option
            .setName('currency')
            .setDescription('Type de monnaie à afficher')
            .setRequired(false)
            .addChoices(
                { name: 'LuluxCoins', value: 'luluxcoins' },
                { name: 'ZermiKoins', value: 'zermikoins' },
                { name: 'Tout', value: 'all' }
            ));

export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const currency = interaction.options.getString('currency') || 'all';

    try {
        const userData = await db.getUser(target.id);
        if (!userData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur')
                .setDescription('Cet utilisateur n\'a pas de compte.')
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const balanceEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`💰 Solde de ${target.username}`);

        if (currency === 'all' || currency === 'luluxcoins') {
            balanceEmbed.addFields({
                name: 'LuluxCoins',
                value: `${userData.balance} ${config.luluxcoinsEmoji}`,
                inline: true
            });
        }

        if (currency === 'all' || currency === 'zermikoins') {
            balanceEmbed.addFields({
                name: 'ZermiKoins',
                value: `${userData.zermikoins || 0} ${config.zermikoinsEmoji}`,
                inline: true
            });
        }

        balanceEmbed.setTimestamp();

        await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
    } catch (error) {
        console.error('Error in balance command:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la récupération du solde.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
} 