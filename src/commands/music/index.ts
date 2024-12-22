import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as handlers from './handlers';

export const data = new SlashCommandBuilder()
    .setName('music')
    .setDescription('Commandes de musique')
    .addSubcommand(subcommand =>
        subcommand
            .setName('play')
            .setDescription('Jouer une musique YouTube')
            .addStringOption(option =>
                option
                    .setName('url')
                    .setDescription('L\'URL YouTube à jouer')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Arrêter la musique')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('skip')
            .setDescription('Passer à la musique suivante')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('info')
            .setDescription('Voir les informations de la file d\'attente')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('loop')
            .setDescription('Mettre en boucle la musique actuelle')
            .addIntegerOption(option =>
                option
                    .setName('times')
                    .setDescription('Nombre de répétitions (0 pour désactiver)')
                    .setRequired(true)
                    .setMinValue(0)
                    .setMaxValue(10)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('connect')
            .setDescription('Connecter le bot à votre salon vocal')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('disconnect')
            .setDescription('Déconnecter le bot du salon vocal')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('clearqueue')
            .setDescription('Vider la file d\'attente')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ban')
            .setDescription('Bannir un utilisateur des commandes de musique')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('L\'utilisateur à bannir')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('unban')
            .setDescription('Débannir un utilisateur des commandes de musique')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('L\'utilisateur à débannir')
                    .setRequired(true)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'play':
            await handlers.play(interaction);
            break;
        case 'stop':
            await handlers.stop(interaction);
            break;
        case 'skip':
            await handlers.skip(interaction);
            break;
        case 'info':
            await handlers.info(interaction);
            break;
        case 'loop':
            await handlers.loop(interaction);
            break;
        case 'connect':
            await handlers.connect(interaction);
            break;
        case 'disconnect':
            await handlers.disconnect(interaction);
            break;
        case 'clearqueue':
            await handlers.clearQueue(interaction);
            break;
        case 'ban':
            await handlers.ban(interaction);
            break;
        case 'unban':
            await handlers.unban(interaction);
            break;
        default:
            await interaction.reply({
                content: '❌ Sous-commande inconnue.',
                ephemeral: true
            });
    }
} 