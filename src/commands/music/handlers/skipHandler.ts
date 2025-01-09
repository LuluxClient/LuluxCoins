import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';

export async function skip(interaction: ChatInputCommandInteraction) {
    // Vérification si l'utilisateur est banni
    if (musicManager.isUserBanned(interaction.user.id)) {
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

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Co toi dans un voc pour skip fdp')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    const status = musicManager.getQueueStatus();
    if (status.loopCount > 0) {
        musicManager.setLoop(0);
    }

    const voteStatus = await musicManager.initiateSkipVote(interaction.user.id, voiceChannel);
    
    // Répondre immédiatement à l'interaction
    await interaction.deferReply({ ephemeral: true });
    
    // Message ephemeral pour l'utilisateur
    await interaction.editReply({
        content: voteStatus.current >= voteStatus.required 
            ? '⏭️ Vote réussi !'
            : `🗳️ Vote enregistré (${voteStatus.current}/${voteStatus.required})`,
    });

    // Message dans le salon musical
    const embed = new EmbedBuilder()
        .setColor(voteStatus.current >= voteStatus.required ? '#00ff00' : '#ffa500')
        .setTitle(voteStatus.current >= voteStatus.required ? '⏭️ Skip' : '🗳️ Vote Skip')
        .setDescription(
            voteStatus.current >= voteStatus.required
                ? 'Allez on skip cette merde'
                : `Vote pour skip: ${voteStatus.current}/${voteStatus.required} votes requis`
        )
        .setTimestamp();

    musicManager.sendChannelMessage(embed);
} 