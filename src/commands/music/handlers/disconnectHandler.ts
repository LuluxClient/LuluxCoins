import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { isStaff } from '../../../utils/permissions';

export async function disconnect(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    
    // Vérification du rôle staff
    if (!isStaff(member)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Accès refusé')
            .setDescription('Nique ta mère')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    const currentChannel = musicManager.getCurrentVoiceChannel();
    
    if (!currentChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Je suis même pas dans un salon vocal fdp')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    if (!member.voice.channel || member.voice.channel.id !== currentChannel.id) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Rejoins mon salon vocal avant de me déco connard')
            .setFooter({ text: `Je suis dans ${currentChannel.name}` })
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    musicManager.disconnect();
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👋 Déconnexion')
        .setDescription(`Ciao les pd, je me casse de **${currentChannel.name}**`)
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
} 