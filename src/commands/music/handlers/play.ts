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
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            skipDownload: true,
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            cookies: cookiesPath,
            getUrl: true,
            addHeader: [
                'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language:en-US,en;q=0.9',
                'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            ],
            sleepInterval: 2,
            noCheckCertificates: true,
            callHome: false,
            youtubeSkipDashManifest: true
        }).then(output => output as unknown as VideoInfo);

        // Amélioration de la logique d'extraction de l'URL audio
        let audioUrl: string | undefined;

        // Vérifier d'abord l'URL directe
        if (typeof info.url === 'string' && info.url) {
            audioUrl = info.url;
        } 
        // Sinon, chercher dans les formats
        else if (info.formats && Array.isArray(info.formats)) {
            // Trier les formats par qualité (supposant qu'ils ont un champ quality_label)
            const audioFormats = info.formats
                .filter(f => f.url && (
                    f.acodec !== 'none' && 
                    !f.format_note?.includes('video')
                ));

            if (audioFormats.length > 0) {
                audioUrl = audioFormats[0].url;
            }
        }

        if (!audioUrl) {
            console.error('Available formats:', JSON.stringify(info.formats, null, 2));
            throw new Error('No valid audio format found');
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

        // Mise à jour de l'interface VideoInfo pour inclure les champs potentiellement manquants
        const title = info.title || 'Unknown Title';
        const duration = typeof info.duration === 'number' ? info.duration : 0;

        musicManager.addToQueue({
            url,
            title,
            duration: formatDuration(duration),
            requestedBy: {
                id: interaction.user.id,
                username: interaction.user.username,
            },
            audioUrl
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
