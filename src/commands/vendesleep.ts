import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { statusManager } from '../database/statusManager';

export const data = new SlashCommandBuilder()
    .setName('vendesleep')
    .setDescription('Voir les stats de sommeil de Vendetta')
    .addBooleanOption(option =>
        option
            .setName('notifications')
            .setDescription('Active ou désactive les notifications de changement de statut')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const toggleOption = interaction.options.getBoolean('notifications');
    
    // Si l'option est fournie, on vérifie les permissions et on toggle
    if (toggleOption !== null) {
        const staffRoleId = process.env.STAFF_ROLE_ID;
        const member = interaction.member as GuildMember;
        if (!staffRoleId || !member || !member.roles.cache.has(staffRoleId)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de modifier les notifications.',
                ephemeral: true
            });
        }

        statusManager.toggleMessages(toggleOption);
        await interaction.reply({
            content: `✅ Les notifications VendeSleep sont maintenant ${toggleOption ? '**activées**' : '**désactivées**'}.`,
            ephemeral: true
        });
        return;
    }

    // Sinon on affiche les stats comme avant
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
        .setDescription(
            `**Status Actuel:** ${stats.currentStatus === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}\n` +
            `**Notifications:** ${statusManager.isMessagesEnabled() ? '🔔 Activées' : '🔕 Désactivées'}`
        )
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