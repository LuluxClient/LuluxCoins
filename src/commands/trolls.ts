import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, EmbedBuilder } from 'discord.js';
import { AutomationManager } from '../automation/AutomationManager';
import { trollActions } from '../automation/actions';
import { trollStateManager } from '../automation/TrollState';
import { config } from '../config';
import { TrollAction } from '../automation/types/AutomationType';

const ALLOWED_USER_ID = '295515087731556362';
const automationManager = new AutomationManager(config.openaiApiKey);

export const data = new SlashCommandBuilder()
    .setName('troll')
    .setDescription('Gérer le système de trolls')
    .addSubcommand(subcommand =>
        subcommand
            .setName('enable')
            .setDescription('Activer le mode troll'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('disable')
            .setDescription('Désactiver le mode troll'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Voir le statut du mode troll'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('test')
            .setDescription('Tester une action sur un utilisateur')
            .addUserOption(option =>
                option
                    .setName('target')
                    .setDescription('L\'utilisateur à troller')
                    .setRequired(true))
            .addStringOption(option =>
                option
                    .setName('action')
                    .setDescription('Le type de troll à exécuter')
                    .addChoices(
                        { name: 'Channel Roulette', value: 'channelRoulette' },
                        { name: 'Multi Ping', value: 'multiPing' },
                        { name: 'Son Aléatoire', value: 'randomLocalSound' },
                        { name: 'Son YouTube', value: 'youtubeSound' },
                        { name: 'Renommer Salons', value: 'tempChannelNames' },
                        { name: 'Discussion', value: 'discussion' },
                        { name: 'Surprise IA', value: 'surpriseAI' },
                        { name: 'Surnom Forcé', value: 'forceNickname' }
                    )
                    .setRequired(false)));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== ALLOWED_USER_ID) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Accès Refusé')
            .setDescription('Tu n\'as pas la permission d\'utiliser cette commande.')
            .setTimestamp();
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'enable':
            await trollStateManager.setEnabled(true);
            const enableEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('😈 Mode Troll')
                .setDescription('Le mode troll a été activé !')
                .setTimestamp();
            await interaction.reply({ embeds: [enableEmbed], ephemeral: true });
            break;

        case 'disable':
            await trollStateManager.setEnabled(false);
            const disableEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('😇 Mode Troll')
                .setDescription('Le mode troll a été désactivé !')
                .setTimestamp();
            await interaction.reply({ embeds: [disableEmbed], ephemeral: true });
            break;

        case 'status':
            const statusEmbed = new EmbedBuilder()
                .setColor(trollStateManager.isEnabled() ? '#FF0000' : '#00FF00')
                .setTitle('🎭 Status du Mode Troll')
                .setDescription(`Le mode troll est actuellement **${trollStateManager.isEnabled() ? 'activé 😈' : 'désactivé 😇'}**`)
                .addFields(
                    {
                        name: '🎯 Actions Disponibles',
                        value: trollActions.map((a: TrollAction) => `\`${a.name}\`: ${a.description}`).join('\n'),
                        inline: false
                    }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
            break;

        case 'test':
            if (!trollStateManager.isEnabled()) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Le mode troll doit être activé pour tester !')
                    .setTimestamp();
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const target = interaction.options.getMember('target');
            const specificAction = interaction.options.getString('action');
            console.log('Target member:', target instanceof GuildMember ? target.user.username : 'Invalid member');
            console.log('Requested action:', specificAction || 'random');
            
            if (!target || !(target instanceof GuildMember)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Utilisateur invalide !')
                    .setTimestamp();
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const testEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🎭 Test en cours')
                .setDescription(`Test ${specificAction ? `de l'action "${specificAction}"` : 'd\'une action aléatoire'} sur ${target.displayName}...`)
                .setTimestamp();
            await interaction.reply({ embeds: [testEmbed], ephemeral: true });

            try {
                const context = {
                    isInVoice: !!target.voice?.channel,
                    messageCount: 0,
                    timeInServer: Date.now() - (target.joinedTimestamp ?? Date.now()),
                    activityType: target.presence?.activities[0]?.type.toString(),
                    forcedAction: specificAction || undefined
                };
                console.log('Creating context for user:', context);

                await automationManager.handleUserAction(target, context);
                console.log('Action executed successfully');
                
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Action Exécutée')
                    .setDescription('L\'action de troll a été exécutée avec succès!')
                    .setTimestamp();
                await interaction.followUp({ embeds: [confirmEmbed], ephemeral: true });

            } catch (error: any) {
                console.error('Error executing troll action:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erreur')
                    .setDescription(`Une erreur est survenue: ${error?.message || 'Erreur inconnue'}`)
                    .setTimestamp();
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
            break;
    }
} 