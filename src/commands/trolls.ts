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

function getActionConditions(action: TrollAction): string {
    switch (action.name) {
        case 'channelRoulette':
            return '- Utilisateur en vocal\n- Au moins 2 salons vocaux disponibles';
        case 'randomLocalSound':
        case 'youtubeSound':
            return '- Utilisateur en vocal';
        case 'multiPing':
            return '- Utilisateur actif dans le chat\n- Au moins 3 salons textuels disponibles';
        case 'tempChannelNames':
            return '- Au moins 3 salons textuels disponibles';
        case 'discussion':
            return '- Utilisateur actif dans le chat\n- Pas d\'autre question en cours';
        case 'surpriseAI':
            return '- Utilisateur actif (vocal ou chat)';
        case 'forceNickname':
            return '- Utilisateur sans surnom forcé actif\n- Permissions suffisantes';
        default:
            return 'Aucune condition spécifique';
    }
}

function formatCooldown(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

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
            const nextCheck = automationManager.getNextCheckTime();
            const timeTillCheck = nextCheck ? nextCheck - Date.now() : 0;
            const minutes = Math.floor(timeTillCheck / 60000);
            const seconds = Math.floor((timeTillCheck % 60000) / 1000);

            const statusEmbed = new EmbedBuilder()
                .setColor(trollStateManager.isEnabled() ? '#FF0000' : '#00FF00')
                .setTitle('🎭 Status du Mode Troll')
                .setDescription(`Le mode troll est actuellement **${trollStateManager.isEnabled() ? 'activé 😈' : 'désactivé 😇'}**`)
                .addFields(
                    {
                        name: '⏰ Prochain Check',
                        value: `Dans ${minutes}m ${seconds}s`,
                        inline: false
                    },
                    {
                        name: '📊 Conditions de Troll',
                        value: `- Utilisateur actif dans les 5 dernières minutes\n- Messages > ${automationManager.MIN_MESSAGES}\n- Temps en vocal > ${Math.floor(automationManager.MIN_VOICE_TIME/60000)}min\n- ${Math.floor(automationManager.TROLL_CHANCE * 100)}% de chance de troll`,
                        inline: false
                    },
                    {
                        name: '👥 Utilisateurs Éligibles',
                        value: (() => {
                            const guild = interaction.guild;
                            if (!guild) return 'Aucun serveur trouvé';

                            const eligibleUsers = Array.from(guild.members.cache.values())
                                .map(member => ({
                                    member,
                                    chance: automationManager.getTrollChance(member)
                                }))
                                .filter(entry => entry.chance > 0.01)
                                .sort((a, b) => b.chance - a.chance);

                            if (eligibleUsers.length === 0) return 'Aucun utilisateur éligible actuellement';

                            return eligibleUsers
                                .map(entry => `${entry.member.displayName}: ${Math.floor(entry.chance * 100)}%`)
                                .join('\n');
                        })(),
                        inline: false
                    },
                    {
                        name: '⏱️ Intervalles de Vérification',
                        value: `- Messages: Instantané\n- Vocal: Toutes les ${Math.floor(automationManager.CHECK_INTERVAL/60000)} minutes\n- Inactivité: Après 5 minutes sans activité\n- Cooldown global: ${Math.floor(automationManager.GLOBAL_COOLDOWN/60000)} minutes`,
                        inline: false
                    },
                    {
                        name: '🔍 Actions Disponibles',
                        value: trollActions.map((a: TrollAction) => {
                            const lastUse = automationManager.getLastActionUse(a.name);
                            const cooldownLeft = lastUse ? Math.max(0, (lastUse + a.cooldown) - Date.now()) : 0;
                            const status = cooldownLeft > 0 ? `🔴 (${formatCooldown(cooldownLeft)})` : '🟢';
                            
                            return `${status} \`${a.name}\` (${formatCooldown(a.cooldown)})\n**Conditions:**\n${getActionConditions(a)}`;
                        }).join('\n\n'),
                        inline: false
                    },
                    {
                        name: '🔍 Debug Info',
                        value: `Dernière activité des utilisateurs:\n${automationManager.getDebugInfo()}`,
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