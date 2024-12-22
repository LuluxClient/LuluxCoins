import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { QueueItem } from '../../../types/musicTypes';

export async function info(interaction: ChatInputCommandInteraction) {
    const status = musicManager.getQueueStatus();
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 File d\'attente musicale')
        .setTimestamp();

    if (status.currentSong) {
        embed.addFields({
            name: '▶️ En cours de lecture',
            value: `[${status.currentSong.title}](${status.currentSong.url})\n` +
                   `Durée: ${status.currentSong.duration}\n` +
                   `Demandé par: ${status.currentSong.requestedBy.username}\n` +
                   `${status.loopCount > 0 ? `🔄 Répétitions restantes: ${status.loopRemaining}` : ''}`
        });
    }

    if (status.queue.length > 0) {
        const queueList = status.queue
            .map((song: QueueItem, index: number) => 
                `${index + 1}. [${song.title}](${song.url}) - ${song.duration} - Demandé par ${song.requestedBy.username}`)
            .join('\n');

        embed.addFields({
            name: '📋 File d\'attente',
            value: queueList.length > 1024 ? queueList.substring(0, 1021) + '...' : queueList
        });
    } else if (!status.currentSong) {
        embed.setDescription('🔇 Aucune musique dans la file d\'attente');
    }

    await interaction.reply({ embeds: [embed] });
} 