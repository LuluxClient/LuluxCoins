import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager } from '../../../managers/musicManager';
import { joinVoiceChannel } from '@discordjs/voice';
import { isStaff } from '../../../utils/permissions';

export async function connect(interaction: ChatInputCommandInteraction) {
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

    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur de connexion')
            .setDescription('Co toi dans un voc fils de pute')
            .setTimestamp();

        return await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId!,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
        });
        
        musicManager.setConnection(connection);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Connexion réussie')
            .setDescription(`Je me suis connecté dans **${voiceChannel.name}**`)
            .setFooter({ text: 'Maintenant tu peux mettre de la musique bg' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur de connexion')
            .setDescription('J\'arrive pas à rejoindre ton salon espèce de fdp')
            .setFooter({ text: 'Vérifie les perms ou change de salon ou sinon je summon 3 bako' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
} 