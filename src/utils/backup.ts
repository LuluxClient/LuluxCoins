import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { db } from '../database/databaseManager';

export class BackupManager {
    private backupDir: string;

    constructor() {
        this.backupDir = path.join(__dirname, '..', '..', 'backups');
    }

    async init() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            console.error('Error creating backup directory:', error);
        }
    }

    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `backup-${timestamp}.json`);

        try {
            const data = {
                users: db.getAllUsers(),
                transactions: db.getTransactions(),
                timestamp: Date.now()
            };

            await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
            console.log(`Backup created successfully: ${backupPath}`);

            // Keep only last 7 days of backups
            await this.cleanOldBackups();
        } catch (error) {
            console.error('Error creating backup:', error);
        }
    }

    private async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter(f => f.startsWith('backup-'));
            
            if (backupFiles.length > 7) {
                const fileStats = await Promise.all(
                    backupFiles.map(async f => ({
                        name: f,
                        time: await fs.stat(path.join(this.backupDir, f))
                    }))
                );
                const sortedFiles = fileStats.sort((a, b) => b.time.mtime.getTime() - a.time.mtime.getTime());

                for (const file of sortedFiles.slice(7)) {
                    await fs.unlink(path.join(this.backupDir, file.name));
                }
            }
        } catch (error) {
            console.error('Error cleaning old backups:', error);
        }
    }

    scheduleBackups() {
        // Schedule backup every day at 1 AM
        cron.schedule('0 1 * * *', () => {
            this.createBackup();
        });
    }
}

export const backupManager = new BackupManager(); 