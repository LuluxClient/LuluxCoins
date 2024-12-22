import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import youtubeDl from 'youtube-dl-exec';
import { joinVoiceChannel } from '@discordjs/voice';

interface VideoInfo {
    title: string;
    duration: number;
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
            ephemeral: true
        });
    }

    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Co toi dans un voc pour mettre de la musique fdp')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
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
            skipDownload: true,
            cookies: '/root/cookies.txt',
            geoBypass: true,
            geoBypassCountry: 'FR',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            format: 'bestaudio',
        }, {
            cwd: process.cwd(),
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

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Musique ajoutée')
            .setDescription(`[${info.title}](${url})`)
            .addFields(
                { name: '⏱️ Durée', value: formatDuration(info.duration), inline: true },
                { name: '👤 Demandé par', value: interaction.user.username, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la lecture de la vidéo.')
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