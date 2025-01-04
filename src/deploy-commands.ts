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
import * as game from './commands/game';
import * as gamestats from './commands/gamestats';
import * as trolls from './commands/trolls';

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
    triggerwords.data,
    game.data,
    gamestats.data,
    trolls.data
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})(); 