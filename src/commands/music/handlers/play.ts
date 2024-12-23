import { ChatInputCommandInteraction, GuildMember, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import youtubeDl from 'youtube-dl-exec';
import { joinVoiceChannel } from '@discordjs/voice';
import { execSync } from 'child_process';
import path from 'path';

interface VideoInfo {
    title: string;
    duration: number;
    url: string;
    formats: Array<{
        url: string;
        acodec?: string;
        format_note?: string;
    }>;
}

export async function play(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    console.log(`[DEBUG] Checking ban status for user ${member.id}`);
    const isBanned = musicManager.isUserBanned(member.id);
    console.log(`[DEBUG] User ${member.id} ban status:`, isBanned);

    if (isBanned) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Accès refusé')
            .setDescription('Tu es banni des commandes de musique.')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }

    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Connecte-toi à un canal vocal pour jouer de la musique.')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }

    if (!voiceChannel.permissionsFor(interaction.client.user!)?.has(PermissionFlagsBits.Connect) ||
    !voiceChannel.permissionsFor(interaction.client.user!)?.has(PermissionFlagsBits.Speak)) {
    return await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Je n\'ai pas les permissions nécessaires pour rejoindre et parler dans ce canal vocal.')
        ],
        ephemeral: true,
    });
}

    const url = interaction.options.getString('url', true);
    await interaction.deferReply({ ephemeral: true });

    try {
        // Update yt-dlp before each use
        const ytDlpPath = path.join(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');
        try {
            execSync(`${ytDlpPath} -U`, { stdio: 'ignore' });
        } catch (error) {
            console.error('Error updating yt-dlp:', error);
        }

        // Use cookies file from current working directory
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');

        const info = await youtubeDl(url, {
            dumpJson: true,
            quiet: true,
            format: 'bestaudio',
            cookies: cookiesPath,
            noCheckCertificates: true,
            callHome: false,
            extractAudio: true,
            audioFormat: 'opus',
            audioQuality: 0,
            addHeader: [
                'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ],
            output: '%(title)s.%(ext)s',
            preferFreeFormats: true,
            noWarnings: true,
            bufferSize: '16K'
        }) as any;

        // Ajout de logs pour le débogage
        console.log('Info reçue:', {
            title: info.title,
            duration: info.duration,
            hasUrl: !!info.url,
            hasFormats: !!info.formats
        });

        let title = info.title || 'Unknown Title';
        let duration = info.duration || 0;
        let audioUrl = info.url || info.formats?.[0]?.url;

        if (!audioUrl) {
            console.error('Pas d\'URL audio trouvée dans:', info);
            throw new Error('Format audio invalide - URL manquante');
        }

        if (!musicManager.getCurrentVoiceChannel()) {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId!,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
                selfDeaf: true,
            });
            musicManager.setConnection(connection);
        }
        musicManager.addToQueue({
            url,
            title,
            duration: formatDuration(duration),
            requestedBy: {
                id: interaction.user.id,
                username: interaction.user.username,
            },
            audioUrl: audioUrl as string
        });

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Musique ajoutée')
            .setDescription(`[${title}](${url})`)
            .addFields(
                { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                { name: '👤 Demandé par', value: interaction.user.username, inline: true },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
        console.error('Erreur lors de la lecture:', error);

        let errorMsg = 'Une erreur est survenue lors de la lecture de la vidéo.';
        if (error.message.includes('Video unavailable')) {
            errorMsg = 'La vidéo n\'est pas disponible. Vérifie l\'URL.';
        } else if (error.message.includes('age-restricted')) {
            errorMsg = 'La vidéo est restreinte par l\'âge.';
        } else if (error.message.includes('No valid audio format found')) {
            errorMsg = 'Impossible de trouver un format audio valide pour cette vidéo. Essaie une autre URL.';
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription(errorMsg)
            .setFooter({ text: 'Vérifie ton URL ou réessaie plus tard' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
