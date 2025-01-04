import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface TrollState {
    enabled: boolean;
}

class TrollStateManager {
    private state: TrollState = { enabled: true };
    private readonly DB_FOLDER = join(process.cwd(), 'src', 'automation', 'database');
    private readonly DB_FILE = join(this.DB_FOLDER, 'trollState.json');

    public async init() {
        // Créer le dossier database s'il n'existe pas
        if (!existsSync(this.DB_FOLDER)) {
            await mkdir(this.DB_FOLDER, { recursive: true });
            console.log('Created database folder:', this.DB_FOLDER);
        }

        try {
            const data = await readFile(this.DB_FILE, 'utf-8');
            this.state = JSON.parse(data);
            console.log('Loaded troll state:', this.state);
        } catch (error) {
            console.log('No existing troll state found, using default state');
            await this.saveState();
        }
    }

    private async saveState() {
        try {
            await writeFile(this.DB_FILE, JSON.stringify(this.state, null, 2));
            console.log('Saved troll state:', this.state);
        } catch (error) {
            console.error('Error saving troll state:', error);
        }
    }

    public async setEnabled(enabled: boolean) {
        this.state.enabled = enabled;
        await this.saveState();
    }

    public isEnabled(): boolean {
        return this.state.enabled;
    }
}

export const trollStateManager = new TrollStateManager(); 