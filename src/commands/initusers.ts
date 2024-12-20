import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../database/databaseManager';
import { config } from '../config';

export const data = new SlashCommandBuilder()
    .setName('initusers')
    .setDescription('Initialize all server members in the database (Staff only)');

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const hasStaffRole = member?.roles.cache.some(role => config.staffRoleIds.includes(role.id));

    if (!hasStaffRole) {
        await interaction.reply({
            content: 'Nique ta mère',
            ephemeral: true
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const guild = interaction.guild;
        if (!guild) {
            await interaction.editReply('Could not find guild!');
            return;
        }

        const members = await guild.members.fetch();
        let initializedCount = 0;

        for (const [_, member] of members) {
            if (!member.user.bot) {
                await db.registerUser(member.id, member.user.username);
                initializedCount++;
            }
        }

        await interaction.editReply(`Successfully initialized ${initializedCount} users in the database!`);
    } catch (error) {
        console.error('Error initializing users:', error);
        await interaction.editReply('An error occurred while initializing users.');
    }
} 