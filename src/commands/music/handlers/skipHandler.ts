import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { isStaff } from '../../../utils/permissions';

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

    // Répondre immédiatement à l'interaction avant toute autre opération
    await interaction.deferReply({ ephemeral: true });

    // Vérifier si l'utilisateur a les permissions de staff
    const hasPermission = isStaff(member);
    const voteStatus = await musicManager.initiateSkipVote(interaction.user.id, voiceChannel, hasPermission);

    try {
        // Message ephemeral pour l'utilisateur
        if (hasPermission) {
            await interaction.editReply({
                content: '⏭️ Skip effectué avec les permissions staff',
            });
        } else {
            await interaction.editReply({
                content: voteStatus.current >= voteStatus.required 
                    ? '⏭️ Vote réussi !'
                    : `🗳️ Vote enregistré (${voteStatus.current}/${voteStatus.required})`,
            });

            // Message dans le salon musical seulement si ce n'est pas un skip avec permission
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
    } catch (error) {
        console.error('Erreur lors de la réponse à l\'interaction:', error);
        // On continue même si on ne peut pas répondre à l'interaction
    }
} 