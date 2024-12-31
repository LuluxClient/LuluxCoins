import { ChatInputCommandInteraction } from 'discord.js';
import * as balance from '../commands/balance';
import * as leaderboard from '../commands/leaderboard';
import * as luluxcoins from '../commands/luluxcoins';
import * as shop from '../commands/shop';
import * as history from '../commands/history';
import * as initusers from '../commands/initusers';
import * as vendesleep from '../commands/vendesleep';
import * as roux from '../commands/harcelement/roux';
import * as music from '../commands/music';
import * as triggerwords from '../commands/triggerwords';
import * as duel from '../commands/duel';
import * as gamestats from '../commands/gamestats';

class CommandHandler {
    private commands = new Map<string, { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }>();

    constructor() {
        [
            balance, leaderboard, luluxcoins, shop, history, initusers, 
            vendesleep, roux, music, triggerwords, duel, gamestats
        ].forEach(command => {
            this.commands.set(command.data.name, command);
        });
    }

    async handleCommand(interaction: ChatInputCommandInteraction) {
        console.log('Commande reçue:', interaction.commandName);
        const command = this.commands.get(interaction.commandName);
        
        if (!command) {
            console.log('Commande non trouvée:', interaction.commandName);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande:', error);
            const errorMessage = {
                content: 'Une erreur est survenue !',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}

export const commandHandler = new CommandHandler(); 