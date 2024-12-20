import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction, ActivityType } from 'discord.js';
import { config } from './config';
import { db } from './database/databaseManager';
import { backupManager } from './utils/backup';
import * as balance from './commands/balance';
import * as leaderboard from './commands/leaderboard';
import * as luluxcoins from './commands/luluxcoins';
import * as shop from './commands/shop';
import * as history from './commands/history';
import * as initusers from './commands/initusers';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

const commands = new Collection<string, { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }>();
[balance, leaderboard, luluxcoins, shop, history, initusers].forEach(command => {
    commands.set(command.data.name, command);
});

client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');
    
    client.user?.setPresence({
        status: 'online',
        activities: [{
            name: '4-0 ce bako de merde',
            type: ActivityType.Playing
        }]
    });
    
    await db.init();
    await backupManager.init();
    backupManager.scheduleBackups();
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = {
            content: 'There was an error executing this command!',
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

client.login(config.token); 