import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';
import { AutomationManager } from '../automation/AutomationManager';

const automationManager = AutomationManager.getInstance(config.openaiApiKey);

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Voir son solde de Zermikoins')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('L\'utilisateur dont vous voulez voir le solde')
            .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild?.members.fetch(target.id);
    
    if (!member) {
        await interaction.reply({ content: 'Utilisateur introuvable !', ephemeral: true });
        return;
    }

    const userData = await db.getUser(target.id);
    if (!userData) {
        await interaction.reply({ content: 'Cet utilisateur n\'a pas de compte !', ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`💰 Balance de ${target.username}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields([
            {
                name: 'Zermikoins',
                value: `${userData.zermikoins} ${config.zermikoinsEmoji}`,
                inline: true
            },
            {
                name: 'Luluxcoins',
                value: `${userData.balance} ${config.luluxcoinsEmoji}`,
                inline: true
            }
        ]);

    try {
        const trollChanceStr = automationManager.formatTrollChance(member);
        embed.addFields({
            name: '🎭 Chance de Troll',
            value: trollChanceStr,
            inline: true
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chances de troll:', error);
        // Continue sans afficher les chances de troll
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
} 