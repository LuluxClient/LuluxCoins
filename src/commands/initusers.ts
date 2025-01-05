import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('initusers')
    .setDescription('Initialiser les utilisateurs avec un montant')
    .addIntegerOption(option =>
        option
            .setName('amount')
            .setDescription('Le montant à donner à chaque utilisateur')
            .setRequired(true))
    .addStringOption(option =>
        option
            .setName('currency')
            .setDescription('Type de monnaie à initialiser')
            .setRequired(true)
            .addChoices(
                { name: 'LuluxCoins', value: 'luluxcoins' },
                { name: 'ZermiKoins', value: 'zermikoins' },
                { name: 'Les deux', value: 'all' }
            ));

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

    const amount = interaction.options.getInteger('amount', true);
    const currency = interaction.options.getString('currency', true);

    try {
        const guild = interaction.guild;
        if (!guild) {
            throw new Error('Guild not found');
        }

        const members = await guild.members.fetch();
        let initializedCount = 0;

        for (const [, member] of members) {
            if (!member.user.bot) {
                if (currency === 'all') {
                    await db.initializeUser(member.id, member.user.username, amount, amount);
                } else {
                    await db.initializeUser(member.id, member.user.username, 
                        currency === 'luluxcoins' ? amount : 0,
                        currency === 'zermikoins' ? amount : 0
                    );
                }
                initializedCount++;
            }
        }

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Succès')
            .setDescription(`${initializedCount} utilisateurs ont été initialisés avec ${amount} ${currency === 'luluxcoins' ? config.luluxcoinsEmoji : currency === 'zermikoins' ? config.zermikoinsEmoji : 'de chaque monnaie'}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
        console.error('Error in initusers command:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'initialisation des utilisateurs.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
} 