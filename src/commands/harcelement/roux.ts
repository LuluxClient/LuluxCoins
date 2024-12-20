import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { harassmentManager } from '../../managers/harassmentManager';

export const data = new SlashCommandBuilder()
    .setName('roux')
    .setDescription('Commande de harcèlement')
    .addSubcommand(subcommand =>
        subcommand
            .setName('start')
            .setDescription('Commencer le harcèlement')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('L\'utilisateur à harceler')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('message')
                    .setDescription('Le message à spammer')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Arrêter le harcèlement')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Modifier le message de harcèlement')
            .addStringOption(option =>
                option
                    .setName('message')
                    .setDescription('Le nouveau message')
                    .setRequired(true)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    // Vérifier que c'est le bon utilisateur
    if (interaction.user.id !== '252454259252002826') {
        await interaction.reply({
            content: 'Tu n\'as pas le droit d\'utiliser cette commande.',
            ephemeral: true
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'start': {
            const target = interaction.options.getUser('user', true);
            const message = interaction.options.getString('message', true);
            await harassmentManager.start(target.id, message);
            await interaction.reply({
                content: `Harcèlement démarré contre ${target.toString()}`,
                ephemeral: true
            });
            break;
        }
        case 'stop': {
            await harassmentManager.stop();
            await interaction.reply({
                content: 'Harcèlement arrêté',
                ephemeral: true
            });
            break;
        }
        case 'edit': {
            const newMessage = interaction.options.getString('message', true);
            const success = await harassmentManager.editMessage(newMessage);
            await interaction.reply({
                content: success ? 'Message modifié' : 'Aucun harcèlement en cours',
                ephemeral: true
            });
            break;
        }
    }
} 