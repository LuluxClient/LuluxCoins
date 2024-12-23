import fs from 'fs/promises';
import path from 'path';

export async function extractYoutubeCookies() {
    try {
        console.log('Using static YouTube cookies...');
        
        // Path for the cookies file
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');
        
        // Vérifie si le fichier existe
        try {
            await fs.access(cookiesPath);
            console.log('Cookie file found');
            return cookiesPath;
        } catch {
            console.error('cookies.txt not found! Please add a valid cookie file');
            throw new Error('Cookie file missing');
        }
    } catch (error) {
        console.error('Error with cookie file:', error);
        throw error;
    }
} 