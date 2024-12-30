import { REST, Routes } from 'discord.js';
import { config } from './config';
import * as balance from './commands/balance';
import * as leaderboard from './commands/leaderboard';
import * as luluxcoins from './commands/luluxcoins';
import * as shop from './commands/shop';
import * as history from './commands/history';
import * as initusers from './commands/initusers';
import * as vendesleep from './commands/vendesleep';
import * as roux from './commands/harcelement/roux';
import * as music from './commands/music';
import * as triggerwords from './commands/triggerwords';

const commands = [
    balance.data,
    leaderboard.data,
    luluxcoins.data,
    shop.data,
    history.data,
    initusers.data,
    vendesleep.data,
    roux.data,
    music.data,
    triggerwords.data
].map(command => command.toJSON());

const rest = new REST().setToken(config.token);

// Déployez les commandes
(async () => {
    try {
        console.log('Début du déploiement des commandes...');
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        console.log('Commandes déployées avec succès !');
    } catch (error) {
        console.error(error);
    }
})(); 