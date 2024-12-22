import { execSync } from 'child_process';
import path from 'path';

export async function extractYoutubeCookies() {
    try {
        const ytDlpPath = path.join(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');
        // Extraire les cookies de Chrome et les sauvegarder
        execSync(`${ytDlpPath} --cookies-from-browser chrome --cookies /root/cookies.txt "https://www.youtube.com"`, {
            stdio: 'ignore'
        });
        console.log('Cookies YouTube extraits avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'extraction des cookies:', error);
    }
} 