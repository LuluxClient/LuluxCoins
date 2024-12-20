import fs from 'fs/promises';
import path from 'path';
import { WebhookClient } from 'discord.js';
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
            
            const timeUntilReset = nextReset.getTime() - now.getTime();
            setTimeout(() => {
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

        await this.webhook.send({
            content: `**Status Update for ${user.username}**\n` +
                    `Reason: ${reason}\n\n` +
                    `**Current Status:** ${user.currentStatus}\n\n` +
                    `**Daily Stats:**\n` +
                    `Online: ${dailyOnline}\n` +
                    `Offline: ${dailyOffline}\n\n` +
                    `**Weekly Stats:**\n` +
                    `Online: ${weeklyOnline}\n` +
                    `Offline: ${weeklyOffline}`
        });
    }

    async handleStatusChange(userId: string, username: string, newStatus: 'online' | 'offline') {
        if (userId !== this.targetUserId) return;

        const now = Date.now();
        let user = this.data.users.find(u => u.userId === userId);

        if (!user) {
            user = {
                userId,
                username,
                currentStatus: newStatus,
                lastStatusChange: now,
                dailyStats: { online: 0, offline: 0, lastReset: now },
                weeklyStats: { online: 0, offline: 0, lastReset: now }
            };
            this.data.users.push(user);
        } else {
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
        }

        await this.save();
        await this.sendStatsWebhook(user, 'Status Change');
    }

    private async resetDailyStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (user) {
            await this.sendStatsWebhook(user, 'Daily Reset');
            user.dailyStats = { online: 0, offline: 0, lastReset: Date.now() };
            await this.save();
        }
    }

    private async resetWeeklyStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (user) {
            await this.sendStatsWebhook(user, 'Weekly Reset');
            user.weeklyStats = { online: 0, offline: 0, lastReset: Date.now() };
            await this.save();
        }
    }

    async getStats() {
        const user = this.data.users.find(u => u.userId === this.targetUserId);
        if (!user) return null;

        const now = Date.now();
        const timeDiff = Math.floor((now - user.lastStatusChange) / 1000);

        // Mettre à jour les stats avec le temps écoulé depuis le dernier changement
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