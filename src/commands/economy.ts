import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Gérer les économies (LuluxCoins et ZermiKoins)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('give')
            .setDescription('Donner des coins à un utilisateur')
            .addUserOption(option =>
                option
                    .setName('target')
                    .setDescription('L\'utilisateur à qui donner des coins')
                    .setRequired(true))
            .addIntegerOption(option =>
                option
                    .setName('amount')
                    .setDescription('Le montant à donner')
                    .setRequired(true))
            .addStringOption(option =>
                option
                    .setName('currency')
                    .setDescription('Type de monnaie')
                    .setRequired(true)
                    .addChoices(
                        { name: 'LuluxCoins', value: 'luluxcoins' },
                        { name: 'ZermiKoins', value: 'zermikoins' }
                    )))
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Retirer des coins à un utilisateur')
            .addUserOption(option =>
                option
                    .setName('target')
                    .setDescription('L\'utilisateur à qui retirer des coins')
                    .setRequired(true))
            .addIntegerOption(option =>
                option
                    .setName('amount')
                    .setDescription('Le montant à retirer')
                    .setRequired(true))
            .addStringOption(option =>
                option
                    .setName('currency')
                    .setDescription('Type de monnaie')
                    .setRequired(true)
                    .addChoices(
                        { name: 'LuluxCoins', value: 'luluxcoins' },
                        { name: 'ZermiKoins', value: 'zermikoins' }
                    )));

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member || !config.staffRoleIds.some(roleId => member.roles.cache.has(roleId))) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Tu n\'as pas la permission d\'utiliser cette commande.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
    }

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    const currency = interaction.options.getString('currency') as 'luluxcoins' | 'zermikoins';

    if (!target || !amount || !currency) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Arguments invalides.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
    }

    const currencyEmoji = currency === 'luluxcoins' ? config.luluxcoinsEmoji : config.zermikoinsEmoji;
    const currencyName = currency === 'luluxcoins' ? 'LuluxCoins' : 'ZermiKoins';

    try {
        if (subcommand === 'give') {
            await db.updateBalance(target.id, amount, 'add', currency);
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Succès')
                .setDescription(`Tu as donné ${amount} ${currencyEmoji} à ${target}.`)
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed] });
        } else if (subcommand === 'remove') {
            await db.updateBalance(target.id, amount, 'remove', currency);
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Succès')
                .setDescription(`Tu as retiré ${amount} ${currencyEmoji} à ${target}.`)
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed] });
        }
    } catch (error) {
        console.error('Error in economy command:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription(`Une erreur est survenue lors de la modification du solde de ${currencyName}.`)
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
} 