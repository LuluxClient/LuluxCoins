import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from '../config';
import { christmasManager } from '../managers/christmasManager';

export const data = new SlashCommandBuilder()
    .setName('doxtest')
    .setDescription('Test the Christmas dox countdown (Owner only)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('start')
            .setDescription('Start the countdown test')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Stop the countdown test')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('trigger')
            .setDescription('Trigger the countdown completion immediately')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== config.ownerID) {
        await interaction.reply({
            content: 'Nique ta mère, t\'as pas les perms',
            ephemeral: true
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'start':
            await christmasManager.startCountdown();
            await interaction.reply({
                content: 'Countdown started!',
                ephemeral: true
            });
            break;

        case 'stop':
            christmasManager.stopCountdown();
            await interaction.reply({
                content: 'Countdown stopped!',
                ephemeral: true
            });
            break;

        case 'trigger':
            await christmasManager.triggerCountdownComplete();
            await interaction.reply({
                content: 'Countdown completion triggered!',
                ephemeral: true
            });
            break;
    }
} 