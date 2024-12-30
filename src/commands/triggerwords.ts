import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from '../config';
import { politicsManager } from '../managers/politicsManager';

export const data = new SlashCommandBuilder()
    .setName('triggerwords')
    .setDescription('Manage trigger words for politics filter (Owner only)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add a new trigger word')
            .addStringOption(option =>
                option
                    .setName('word')
                    .setDescription('The word to add')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remove a trigger word')
            .addStringOption(option =>
                option
                    .setName('word')
                    .setDescription('The word to remove')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('View all trigger words')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('enable')
            .setDescription('Enable the politics filter')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('disable')
            .setDescription('Disable the politics filter')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Check if the politics filter is enabled')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!politicsManager.isAllowedUser(interaction.user.id)) {
        await interaction.reply({
            content: 'Nique ta mère, t\'as pas les perms',
            ephemeral: true
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'add':
            const wordToAdd = interaction.options.getString('word', true).toLowerCase();
            const added = await politicsManager.addTriggerWord(wordToAdd);
            await interaction.reply({
                content: added ? `Added trigger word: ${wordToAdd}` : `Word already exists: ${wordToAdd}`,
                ephemeral: true
            });
            break;

        case 'remove':
            const wordToRemove = interaction.options.getString('word', true).toLowerCase();
            const removed = await politicsManager.removeTriggerWord(wordToRemove);
            await interaction.reply({
                content: removed ? `Removed trigger word: ${wordToRemove}` : `Word not found: ${wordToRemove}`,
                ephemeral: true
            });
            break;

        case 'list':
            const words = await politicsManager.getTriggerWords();
            await interaction.reply({
                content: `Current trigger words:\n${words.join(', ')}`,
                ephemeral: true
            });
            break;

        case 'enable':
            await politicsManager.setEnabled(true);
            await interaction.reply({
                content: 'Politics filter has been enabled',
                ephemeral: true
            });
            break;

        case 'disable':
            await politicsManager.setEnabled(false);
            await interaction.reply({
                content: 'Politics filter has been disabled',
                ephemeral: true
            });
            break;

        case 'status':
            const enabled = await politicsManager.isEnabled();
            await interaction.reply({
                content: `Politics filter is currently ${enabled ? 'enabled' : 'disabled'}`,
                ephemeral: true
            });
            break;
    }
} 