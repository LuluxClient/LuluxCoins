import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { QueueItem } from '../../../types/musicTypes';

export async function info(interaction: ChatInputCommandInteraction) {
    const status = musicManager.getQueueStatus();
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 Lecteur Musical')
        .setTimestamp();

    if (!status.currentSong && status.queue.length === 0) {
        embed.setDescription('🔇 La file d\'attente est vide.');
        return await interaction.reply({ 
            embeds: [embed],
            ephemeral: true 
        });
    }

    embed.setDescription(`${status.queue.length} musiques dans la file d'attente`);

    if (status.currentSong) {
        const loopStatus = status.loopCount > 0 
            ? `\n🔄 Mode répétition: ${status.loopRemaining}/${status.loopCount} restantes`
            : '\n➡️ Mode répétition: désactivé';

        embed.addFields({
            name: '▶️ En cours de lecture',
            value: `[${status.currentSong.title}](${status.currentSong.url})\n` +
                   `⏱️ Durée: \`${status.currentSong.duration}\`\n` +
                   `👤 Demandé par: **${status.currentSong.requestedBy.username}**` +
                   loopStatus
        });
    }

    if (status.queue.length > 0) {
        const queueList = status.queue
            .slice(0, 10)
            .map((song: QueueItem, index: number) => 
                `\`${(index + 1).toString().padStart(2, '0')}.\` [${song.title}](${song.url}) - \`${song.duration}\` - Demandé par **${song.requestedBy.username}**`)
            .join('\n');

        const remainingCount = status.queue.length - 10;
        const footerText = remainingCount > 0 ? `\n_Et ${remainingCount} autres musiques..._` : '';

        embed.addFields({
            name: `📋 File d'attente (${status.queue.length} musiques)`,
            value: queueList + footerText
        });

        const totalDuration = status.queue.reduce((acc, song) => {
            const [minutes, seconds] = song.duration.split(':').map(Number);
            return acc + (minutes * 60 + seconds);
        }, 0);
        
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const totalDurationStr = hours > 0 
            ? `${hours}h ${minutes}m`
            : `${minutes}m`;

        embed.setFooter({
            text: `Durée totale de la file d'attente: ${totalDurationStr}`
        });
    }

    await interaction.reply({ 
        embeds: [embed],
        ephemeral: true 
    });
} 