import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import youtubeDl from 'youtube-dl-exec';
import path from 'path';

const audioPlayer = createAudioPlayer();

audioPlayer.on(AudioPlayerStatus.Playing, () => {
    console.log('[DEBUG] Started playing');
});

audioPlayer.on('error', error => {
    console.error('[DEBUG] Error:', error);
});

export const data = new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music commands')
    .addSubcommand(subcommand =>
        subcommand
            .setName('play')
            .setDescription('Play a YouTube video')
            .addStringOption(option =>
                option
                    .setName('url')
                    .setDescription('The YouTube URL to play')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Stop the current playing music')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'play') {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: 'You need to be in a voice channel to play music!',
                ephemeral: true
            });
            return;
        }

        try {
            const url = interaction.options.getString('url', true);
            console.log('[DEBUG] Attempting to play URL:', url);
            
            await interaction.reply('⏳ Preparing stream...');

            // Get audio stream URL
            const output = await youtubeDl(url, {
                format: 'bestaudio',
                getUrl: true
            });

            const audioUrl = output.toString().trim();
            
            // Join voice channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId!,
                adapterCreator: interaction.guild!.voiceAdapterCreator,
            });

            // Create and play audio resource
            const resource = createAudioResource(audioUrl);

            connection.subscribe(audioPlayer);
            audioPlayer.play(resource);

            await interaction.editReply(`🎵 Now playing: ${url}`);

        } catch (error: any) {
            console.error('[DEBUG] Playback error:', error);
            await interaction.editReply({
                content: `There was an error playing the music! Error: ${error?.message || 'Unknown error'}`
            });
        }
    }

    if (subcommand === 'stop') {
        try {
            audioPlayer.stop();
            await interaction.reply('⏹️ Stopped playing music');
        } catch (error) {
            console.error('[DEBUG] Stop error:', error);
            await interaction.reply({
                content: 'There was an error stopping the music!',
                ephemeral: true
            });
        }
    }
} 