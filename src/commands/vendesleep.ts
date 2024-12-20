import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { statusManager } from '../database/statusManager';

export const data = new SlashCommandBuilder()
    .setName('vendesleep')
    .setDescription('Voir les stats de sommeil de Vendetta');

export async function execute(interaction: ChatInputCommandInteraction) {
    const stats = await statusManager.getStats();
    
    if (!stats) {
        await interaction.reply({
            content: 'Aucune donnée disponible pour Vendetta',
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(stats.currentStatus === 'online' ? '#00FF00' : '#FF0000')
        .setTitle('🛏️ Stats de Sommeil de Vendetta')
        .setDescription(`**Status Actuel:** ${stats.currentStatus === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}`)
        .addFields(
            {
                name: '📊 Stats Journalières',
                value: `En ligne: \`${stats.dailyOnline}\`\nHors ligne: \`${stats.dailyOffline}\``,
                inline: false
            },
            {
                name: '📈 Stats Hebdomadaires',
                value: `En ligne: \`${stats.weeklyOnline}\`\nHors ligne: \`${stats.weeklyOffline}\``,
                inline: false
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 