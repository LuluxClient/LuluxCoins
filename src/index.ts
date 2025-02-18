import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction, ActivityType, TextChannel } from 'discord.js';
import { config } from './config';
import { db } from './database/databaseManager';
import { backupManager } from './utils/backup';
import { statusManager } from './database/statusManager';
import { harassmentManager } from './managers/harassmentManager';
import { politicsManager } from './managers/politicsManager';
import * as balance from './commands/balance';
import * as leaderboard from './commands/leaderboard';
import * as economy from './commands/economy';
import * as shop from './commands/shop';
import * as history from './commands/history';
import * as initusers from './commands/initusers';
import * as vendesleep from './commands/vendesleep';
import * as roux from './commands/harcelement/roux';
import * as music from './commands/music';
import * as triggerwords from './commands/triggerwords';
import * as game from './commands/game';
import * as gamestats from './commands/gamestats';
import { musicManager } from './managers/musicManager';
import { extractYoutubeCookies } from './utils/cookieExtractor';
import { GameInteractionHandler } from './games/handlers/GameInteractionHandler';
import { initGameManagers } from './games';
import { initTicTacToeManager } from './games/tictactoe/TicTacToeManager';
import { initConnect4Manager } from './games/connect4/Connect4Manager';
import { initBlackjackManager } from './games/blackjack/BlackjackManager';
import { replayManager } from './games/common/managers/ReplayManager';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const commands = new Collection<string, { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }>();
[
    balance, leaderboard, economy, shop, history, initusers, 
    vendesleep, roux, music, triggerwords, game, gamestats
].forEach(command => {
    commands.set(command.data.name, command);
});

client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');
    
    try {
        await extractYoutubeCookies();
        console.log('YouTube cookies extracted successfully');
    } catch (error) {
        console.error('Failed to extract YouTube cookies:', error);
    }
    
    musicManager.setClient(client); 
    client.user?.setPresence({
        status: 'online',
        activities: [{
            name: '4-0 ce bako de merde',
            type: ActivityType.Playing
        }]
    });
    
    await db.init();
    await backupManager.init();
    await statusManager.init();
    harassmentManager.setClient(client);
    await harassmentManager.init();
    backupManager.scheduleBackups();
    
    musicManager.setClient(client);
    
    try {
        const musicChannel = await client.channels.fetch('1320439761873272844') as TextChannel;
        if (musicChannel?.isTextBased()) {
            musicManager.setMusicChannel(musicChannel);
            console.log('Canal de musique configuré avec succès');
        } else {
            console.error('Le canal de musique n\'est pas un canal textuel');
        }
    } catch (error) {
        console.error('Erreur lors de la configuration du canal de musique:', error);
    }

    await politicsManager.init();
    console.log('Politics manager initialized successfully');
    
    initGameManagers(client);
    initTicTacToeManager(client);
    initConnect4Manager(client);
    initBlackjackManager(client);
    replayManager.setClient(client);

    console.log('Game managers initialized successfully');


});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        const [action, gameType] = interaction.customId.split('_');
        if (gameType === 'tictactoe' || gameType === 'connect4' || gameType === 'blackjack' || action === 'replay') {
            await GameInteractionHandler.handleButtonInteraction(interaction);
            return;
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
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
});

client.on(Events.GuildMemberAdd, async member => {
    await db.registerUser(member.id, member.user.username);
});

client.on(Events.PresenceUpdate, async (newPresence) => {
    if (!newPresence || !newPresence.user) return;
    
    const isOnline = ['online', 'dnd'].includes(newPresence.status);
    const isOffline = ['offline', 'idle'].includes(newPresence.status);
    
    if (isOnline) {
        await statusManager.handleStatusChange(newPresence.user.id, newPresence.user.username, 'online');
    } else if (isOffline) {
        await statusManager.handleStatusChange(newPresence.user.id, newPresence.user.username, 'offline');
    }
});


client.login(config.token);


process.on('SIGTERM', async () => {
    console.log('Arrêt du bot...');
    await statusManager.shutdown();
    process.exit(0);
}); 