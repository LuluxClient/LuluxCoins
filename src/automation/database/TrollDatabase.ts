import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { UserContext } from '../AutomationManager';

interface TrollData {
    users: Map<string, UserContext>;
    lastUpdate: number;
}

export class TrollDatabase {
    private data: TrollData = {
        users: new Map(),
        lastUpdate: Date.now()
    };
    private readonly DB_FOLDER = join(process.cwd(), 'src', 'automation', 'database');
    private readonly DB_FILE = join(this.DB_FOLDER, 'trollData.json');
    private saveTimeout: NodeJS.Timeout | null = null;

    public async init() {
        if (!existsSync(this.DB_FOLDER)) {
            await mkdir(this.DB_FOLDER, { recursive: true });
        }

        try {
            const fileData = await readFile(this.DB_FILE, 'utf-8');
            const parsed = JSON.parse(fileData);
            
            // Convertir les données en Map avec validation
            const users = new Map();
            for (const [userId, userData] of Object.entries(parsed.users)) {
                const context = userData as UserContext;
                // S'assurer que lastActivity est une Date
                context.lastActivity = new Date(context.lastActivity);
                // S'assurer que toutes les propriétés existent
                context.messageCount = context.messageCount ?? 0;
                context.voiceTime = context.voiceTime ?? 0;
                context.baseChance = context.baseChance ?? 0;
                context.lastTrollTime = context.lastTrollTime ?? 0;
                context.lastMessageTime = context.lastMessageTime ?? 0;
                context.lastVoiceJoin = context.lastVoiceJoin ?? 0;
                context.activityStreak = context.activityStreak ?? 0;
                users.set(userId, context);
            }

            this.data = {
                users,
                lastUpdate: parsed.lastUpdate || Date.now()
            };
            console.log('Loaded troll data for', users.size, 'users');
        } catch (error) {
            console.log('No existing troll data found or error loading, using default');
            await this.save();
        }
    }

    private async save() {
        try {
            // Convertir les données pour la sauvegarde
            const serialized = {
                users: Object.fromEntries(Array.from(this.data.users.entries()).map(([userId, context]) => [
                    userId,
                    {
                        ...context,
                        lastActivity: context.lastActivity.toISOString() // Convertir la Date en string
                    }
                ])),
                lastUpdate: Date.now()
            };
            await writeFile(this.DB_FILE, JSON.stringify(serialized, null, 2));
            console.log('Saved troll data successfully');
        } catch (error) {
            console.error('Error saving troll data:', error);
        }
    }

    public getUser(userId: string): UserContext | undefined {
        return this.data.users.get(userId);
    }

    public getAllUsers(): Map<string, UserContext> {
        return this.data.users;
    }

    public setUser(userId: string, context: UserContext) {
        this.data.users.set(userId, context);
        this.scheduleSave();
    }

    private scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => this.save(), 1000);
    }

    public cleanup() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
    }
} 