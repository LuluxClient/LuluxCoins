import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import youtubeDl from 'youtube-dl-exec';
import { joinVoiceChannel } from '@discordjs/voice';

interface VideoInfo {
    title: string;
    duration: number;
}

export async function play(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return await interaction.reply({
            content: '❌ Vous devez être dans un salon vocal pour utiliser cette commande.',
            ephemeral: true
        });
    }

    const url = interaction.options.getString('url', true);
    await interaction.deferReply({ ephemeral: true });

    try {
        const info = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            skipDownload: true
        }) as VideoInfo;

        if (!musicManager.getCurrentVoiceChannel()) {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId!,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
            });
            musicManager.setConnection(connection);
        }

        musicManager.addToQueue({
            url,
            title: info.title,
            duration: formatDuration(info.duration),
            requestedBy: {
                id: interaction.user.id,
                username: interaction.user.username
            }
        });

        await interaction.editReply({
            content: `✅ **${info.title}** a été ajouté à la file d'attente.`
        });

    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        await interaction.editReply({
            content: '❌ Une erreur est survenue lors de la lecture de la vidéo.'
        });
    }
}

function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 