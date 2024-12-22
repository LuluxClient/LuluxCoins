import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export async function extractYoutubeCookies() {
    try {
        // Chemin vers le profil Firefox par défaut
        const profilePath = '/root/.mozilla/firefox/*.default-release';
        
        // Commande pour extraire les cookies YouTube
        const command = `
            sqlite3 ${profilePath}/cookies.sqlite "SELECT name, value FROM moz_cookies WHERE host LIKE '%youtube%'" -csv > /root/cookies.txt
        `;

        // Exécuter la commande
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error('Erreur lors de l\'extraction des cookies:', error);
                return;
            }
            
            // Formater le fichier cookies.txt au format Netscape
            const cookies = await fs.readFile('/root/cookies.txt', 'utf-8');
            const formattedCookies = cookies
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [name, value] = line.split(',');
                    return `youtube.com\tTRUE\t/\tTRUE\t2597573456\t${name}\t${value}`;
                })
                .join('\n');

            await fs.writeFile('/root/cookies.txt', formattedCookies);
            console.log('Cookies YouTube extraits avec succès');
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
} 