import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { ticTacToeManager } from '../games/tictactoe/TicTacToeManager';
import { connect4Manager } from '../games/connect4/Connect4Manager';
import { blackjackManager } from '../games/blackjack/BlackjackManager';
import { EmbedBuilder } from '@discordjs/builders';
import { config } from '../config';
import { TicTacToeUI } from '../games/tictactoe/ui/TicTacToeUI';
import { Connect4UI } from '../games/connect4/ui/Connect4UI';

export const data = new SlashCommandBuilder()
    .setName('game')
    .setDescription('Lance une partie contre un joueur ou le bot')
    .addStringOption(option =>
        option.setName('jeu')
            .setDescription('Le jeu auquel jouer')
            .setRequired(true)
            .addChoices(
                { name: 'Morpion', value: 'tictactoe' },
                { name: 'Puissance 4', value: 'connect4' },
                { name: 'Blackjack', value: 'blackjack' }
            ))
    .addIntegerOption(option =>
        option.setName('mise')
            .setDescription('La mise à parier (0 pour aucune mise)')
            .setRequired(true)
            .setMinValue(0))
    .addUserOption(option =>
        option.setName('joueur')
            .setDescription('Le joueur contre qui jouer (laissez vide pour jouer contre le bot)')
            .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser('joueur');
    const gameType = interaction.options.getString('jeu', true);
    const wager = interaction.options.getInteger('mise', true);

    // Pour le blackjack, on ne peut pas jouer contre un joueur
    if (gameType === 'blackjack' && opponent) {
        await interaction.reply({
            content: 'Le Blackjack se joue uniquement contre le bot !',
            ephemeral: true
        });
        return;
    }

    try {
        let game;
        let embed;
        let buttons;

        if (gameType === 'tictactoe') {
            game = await ticTacToeManager.createGame(interaction.user, opponent || 'bot', wager);
            if (opponent) {
                embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎮 Défi Morpion')
                    .setDescription(`${interaction.user} défie ${opponent} en 1v1 en Morpion${wager > 0 ? ` pour ${wager} ${config.zermikoinsEmoji}` : ''} !`)
                    .addFields({ 
                        name: 'Temps restant', 
                        value: '60 secondes' 
                    });
                buttons = ticTacToeManager.createGameButtons(game);

                const message = await interaction.reply({ 
                    content: `${interaction.user} ${opponent}`,
                    embeds: [embed], 
                    components: buttons,
                    fetchReply: true 
                });
                await ticTacToeManager.addGameMessage(game.id, message);
            } else {
                embed = await TicTacToeUI.createGameEmbed(game);
                buttons = ticTacToeManager.createGameButtons(game);
                const message = await interaction.reply({ 
                    embeds: [embed], 
                    components: buttons,
                    fetchReply: true 
                });
                await ticTacToeManager.addGameMessage(game.id, message);
            }
        } else if (gameType === 'connect4') {
            game = await connect4Manager.createGame(interaction.user, opponent || 'bot', wager);
            if (opponent) {
                embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎮 Défi Puissance 4')
                    .setDescription(`${interaction.user} défie ${opponent} en 1v1 en Puissance 4${wager > 0 ? ` pour ${wager} ${config.zermikoinsEmoji}` : ''} !`)
                    .addFields({ 
                        name: 'Temps restant', 
                        value: '60 secondes' 
                    });
                buttons = connect4Manager.createGameButtons(game);

                const message = await interaction.reply({ 
                    content: `${interaction.user} ${opponent}`,
                    embeds: [embed], 
                    components: buttons,
                    fetchReply: true 
                });
                await connect4Manager.addGameMessage(game.id, message);
            } else {
                embed = await Connect4UI.createGameEmbed(game);
                buttons = connect4Manager.createGameButtons(game);
                const message = await interaction.reply({ 
                    embeds: [embed], 
                    components: buttons,
                    fetchReply: true 
                });
                await connect4Manager.addGameMessage(game.id, message);
            }
        } else if (gameType === 'blackjack') {
            game = await blackjackManager.createGame(interaction.user, wager);
            embed = await blackjackManager.createGameEmbed(game);
            buttons = blackjackManager.createGameButtons(game);
            const message = await interaction.reply({ 
                embeds: [embed], 
                components: buttons,
                fetchReply: true 
            });
            await blackjackManager.addGameMessage(game.id, message);
        } else {
            await interaction.reply({ 
                content: 'Type de jeu non valide', 
                ephemeral: true 
            });
            return;
        }

    } catch (error: any) {
        if (!interaction.replied) {
            await interaction.reply({ 
                content: error.message, 
                ephemeral: true 
            });
        }
    }
} 