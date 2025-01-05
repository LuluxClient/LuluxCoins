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
            this.data = {
                users: new Map(Object.entries(parsed.users)),
                lastUpdate: parsed.lastUpdate
            };
            console.log('Loaded troll data:', this.data);
        } catch (error) {
            console.log('No existing troll data found, using default');
            await this.save();
        }
    }

    private async save() {
        try {
            const serialized = {
                users: Object.fromEntries(this.data.users),
                lastUpdate: this.data.lastUpdate
            };
            await writeFile(this.DB_FILE, JSON.stringify(serialized, null, 2));
            console.log('Saved troll data');
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