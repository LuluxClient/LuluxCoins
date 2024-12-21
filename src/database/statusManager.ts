import fs from 'fs/promises';
import path from 'path';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import { UserStatus, StatusDatabase } from '../types/statusTypes';

export class StatusManager {
    private dbPath: string;
    private data: StatusDatabase;
    private webhook: WebhookClient;
    private targetUserId = '273898521344606208';
    private targetUsername = 'Vendetta';
    private saveInterval: NodeJS.Timeout | null = null;
    private readonly SAVE_INTERVAL = 30000; // Sauvegarde toutes les 30 secondes

    constructor() {
        this.dbPath = path.join(__dirname, 'status.json');
        this.data = { users: [] };
        this.webhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1317886430558683176/kvZVtcX4H_2CJAaSgUN6AsXjr2oLenAV5hVAN_wGjShDpFBqA5SVud2_of9IFWZPBXud' });
    }

    private formatDuration(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    async init() {
        try {
            const fileContent = await fs.readFile(this.dbPath, 'utf-8');
            this.data = JSON.parse(fileContent);
        } catch {
            await this.save();
        }

        if (!this.data.users.find(u => u.userId === this.targetUserId)) {
            this.data.users.push({
                userId: this.targetUserId,
                username: this.targetUsername,
                currentStatus: 'offline',
                lastStatusChange: Date.now(),
                dailyStats: { online: 0, offline: 0, lastReset: Date.now() },
                weeklyStats: { online: 0, offline: 0, lastReset: Date.now() }
            });
            await this.save();
        }

        this.setupResetTimers();
        this.startPeriodicSave();
    }

    private setupResetTimers() {
        const scheduleDailyReset = () => {
            const now = new Date();
            const nextReset = new Date(now);
            nextReset.setHours(23, 59, 0, 0);
            
            let timeUntilReset = nextReset.getTime() - now.getTime();
            if (timeUntilReset < 1000) {
                nextReset.setDate(nextReset.getDate() + 1);
                timeUntilReset = nextReset.getTime() - now.getTime();
            }
            
            setTimeout(() => {
                const user = this.data.users.find(u => u.userId === this.targetUserId);
                if (user) {
                    const oldStats = {
                        dailyOnline: user.dailyStats.online,
                        dailyOffline: user.dailyStats.offline
                    };
                    
                    if (oldStats.dailyOnline === 0 && oldStats.dailyOffline === 0) {
                        scheduleDailyReset();
                        return;
                    }

                    const now = Date.now();
                    const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);
                    
                    // Mettre à jour les stats avec le temps écoulé avant le reset
                    if (user.currentStatus === 'online') {
                        user.dailyStats.online += timeDiff;
                    } else {
                        user.dailyStats.offline += timeDiff;
                    }
                    user.lastStatusChange = now;
                }
                
                this.resetDailyStats();
                scheduleDailyReset();
            }, timeUntilReset);
        };

        const scheduleWeeklyReset = () => {
            const now = new Date();
            const nextReset = new Date(now);
            nextReset.setHours(23, 59, 0, 0);
            while (nextReset.getDay() !== 0) {
                nextReset.setDate(nextReset.getDate() + 1);
            }
            
            const timeUntilReset = nextReset.getTime() - now.getTime();
            setTimeout(() => {
                this.resetWeeklyStats();
                scheduleWeeklyReset();
            }, timeUntilReset);
        };

        scheduleDailyReset();
        scheduleWeeklyReset();
    }

    private async save() {
        await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    }

    private async sendStatsWebhook(user: UserStatus, reason: string) {
        const now = Date.now();
        const dailyOnline = this.formatDuration(user.dailyStats.online);
        const dailyOffline = this.formatDuration(user.dailyStats.offline);
        const weeklyOnline = this.formatDuration(user.weeklyStats.online);
        const weeklyOffline = this.formatDuration(user.weeklyStats.offline);

        const embed = new EmbedBuilder()
            .setColor(user.currentStatus === 'online' ? '#00FF00' : '#FF0000')
            .setTitle('🛏️ Stats de Sommeil de Vendetta')
            .setDescription(
                `**Status Actuel:** ${user.currentStatus === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}\n\n` +
                `📊 **Stats Journalières**\n` +
                `En ligne: \`${dailyOnline}\`\n` +
                `Hors ligne: \`${dailyOffline}\`\n\n` +
                `📈 **Stats Hebdomadaires**\n` +
                `En ligne: \`${weeklyOnline}\`\n` +
                `Hors ligne: \`${weeklyOffline}\``
            )
            .setFooter({ text: `Raison: ${this.translateReason(reason)}` })
            .setTimestamp();

        await this.webhook.send({
            embeds: [embed]
        });
    }

    private translateReason(reason: string): string {
        switch (reason) {
            case 'Status Change':
                return 'Changement de statut';
            case 'Daily Reset':
                return 'Réinitialisation journalière';
            case 'Weekly Reset':
                return 'Réinitialisation hebdomadaire';
            default:
                return reason;
        }
    }

    async handleStatusChange(userId: string, username: string, newStatus: 'online' | 'offline') {
        const user = this.data.users.find(u => u.userId === userId);
        if (!user) return;

        if (user.currentStatus === newStatus) {
            return;
        }

        const now = Date.now();
        const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);

        if (user.currentStatus === 'online') {
            user.dailyStats.online += timeDiff;
            user.weeklyStats.online += timeDiff;
        } else {
            user.dailyStats.offline += timeDiff;
            user.weeklyStats.offline += timeDiff;
        }

        user.currentStatus = newStatus;
        user.lastStatusChange = now;

        await this.save();
        await this.sendStatsWebhook(user, 'Changement de statut');
    }

    private async resetDailyStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (user) {
            const now = Date.now();
            if (now - user.dailyStats.lastReset < 3600000) {
                return; 
            }
            
            const oldStats = {
                dailyOnline: user.dailyStats.online,
                dailyOffline: user.dailyStats.offline
            };
            
            if (oldStats.dailyOnline === 0 && oldStats.dailyOffline === 0) {
                return;
            }
            
            await this.sendStatsWebhook(user, 'Daily Reset');
            user.dailyStats = { online: 0, offline: 0, lastReset: Date.now() };
            await this.save();
        }
    }

    private async resetWeeklyStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (user) {
            const now = Date.now();
            if (now - user.weeklyStats.lastReset < 3600000) {
                return;
            }
    
            const oldStats = {
                weeklyOnline: user.weeklyStats.online,
                weeklyOffline: user.weeklyStats.offline
            };
    
            if (oldStats.weeklyOnline === 0 && oldStats.weeklyOffline === 0) {
                return;
            }
            const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);
            if (user.currentStatus === 'online') {
                user.weeklyStats.online += timeDiff;
            } else {
                user.weeklyStats.offline += timeDiff;
            }
            user.lastStatusChange = now;
    
            await this.sendStatsWebhook(user, 'Weekly Reset');
            user.weeklyStats = { online: 0, offline: 0, lastReset: now };
            await this.save();
        }
    }

    async getStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (!user) return null;

        const now = Date.now();
        const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);

        // Mettre à jour les stats avec le temps écoulé depuis le dernier changement pd
        const currentStats = {
            currentStatus: user.currentStatus,
            dailyOnline: this.formatDuration(
                user.currentStatus === 'online' 
                    ? user.dailyStats.online + timeDiff 
                    : user.dailyStats.online
            ),
            dailyOffline: this.formatDuration(
                user.currentStatus === 'offline' 
                    ? user.dailyStats.offline + timeDiff 
                    : user.dailyStats.offline
            ),
            weeklyOnline: this.formatDuration(
                user.currentStatus === 'online' 
                    ? user.weeklyStats.online + timeDiff 
                    : user.weeklyStats.online
            ),
            weeklyOffline: this.formatDuration(
                user.currentStatus === 'offline' 
                    ? user.weeklyStats.offline + timeDiff 
                    : user.weeklyStats.offline
            )
        };

        return currentStats;
    }

    private startPeriodicSave() {
        // Arrêter l'intervalle existant si présent
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        this.saveInterval = setInterval(async () => {
            const user = this.data.users.find(u => u.userId === this.targetUserId);
            if (user) {
                const now = Date.now();
                const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);

                // Mettre à jour les stats avec le temps écoulé
                if (user.currentStatus === 'online') {
                    user.dailyStats.online += timeDiff;
                    user.weeklyStats.online += timeDiff;
                } else {
                    user.dailyStats.offline += timeDiff;
                    user.weeklyStats.offline += timeDiff;
                }

                // Mettre à jour le timestamp du dernier changement
                user.lastStatusChange = now;

                await this.save();
            }
        }, this.SAVE_INTERVAL);
    }

    // Méthode pour arrêter proprement le manager
    async shutdown() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        // Sauvegarde finale avant l'arrêt
        await this.save();
    }
}

export const statusManager = new StatusManager(); 