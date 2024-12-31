import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { ticTacToeManager } from '../games/tictactoe/TicTacToeManager';
import { connect4Manager } from '../games/connect4/Connect4Manager';
import { messageManager } from '../games/common/messages/MessageManager';

export const data = new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Défie un joueur ou le bot à un jeu')
    .addStringOption(option =>
        option.setName('jeu')
            .setDescription('Le jeu auquel jouer')
            .setRequired(true)
            .addChoices(
                { name: 'Morpion', value: 'tictactoe' },
                { name: 'Puissance 4', value: 'connect4' }
            ))
    .addIntegerOption(option =>
        option.setName('mise')
            .setDescription('La mise à parier (0 pour aucune mise)')
            .setRequired(true)
            .setMinValue(0))
    .addUserOption(option =>
        option.setName('joueur')
            .setDescription('Le joueur à défier (laissez vide pour jouer contre le bot)')
            .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    const challenged = interaction.options.getUser('joueur');
    const gameType = interaction.options.getString('jeu', true);
    const wager = interaction.options.getInteger('mise', true);

    // Si aucun joueur n'est spécifié, on joue contre le bot
    const opponent = challenged || 'bot';

    try {
        let game;
        let embed;
        let buttons;

        if (gameType === 'tictactoe') {
            game = await ticTacToeManager.createGame(interaction.user, opponent, wager);
            embed = ticTacToeManager.createGameEmbed(game);
            buttons = ticTacToeManager.createGameButtons(game);
        } else if (gameType === 'connect4') {
            game = await connect4Manager.createGame(interaction.user, opponent, wager);
            embed = connect4Manager.createGameEmbed(game);
            buttons = connect4Manager.createGameButtons(game);
        } else {
            throw new Error('Type de jeu non valide');
        }

        if (!game || !embed || !buttons) {
            throw new Error('Erreur lors de la création de la partie');
        }

        const message = await interaction.reply({ 
            content: opponent === 'bot' ? '' : `<@${opponent.id}>, tu as été défié !`,
            embeds: [embed], 
            components: buttons,
            fetchReply: true 
        });

        if (gameType === 'tictactoe') {
            ticTacToeManager.addGameMessage(game.id, message);
        } else if (gameType === 'connect4') {
            connect4Manager.addGameMessage(game.id, message);
        }

    } catch (error: any) {
        await interaction.reply({ 
            content: error.message, 
            ephemeral: true 
        });
    }
} 