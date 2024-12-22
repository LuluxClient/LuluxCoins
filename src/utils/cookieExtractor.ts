import fs from 'fs/promises';

export async function extractYoutubeCookies() {
    try {
        // Créer un fichier de cookies basique avec le consentement
        const cookieContent = `youtube.com	TRUE	/	TRUE	2597573456	CONSENT	YES+`;
        
        await fs.writeFile('/root/cookies.txt', cookieContent);
        console.log('Fichier de cookies YouTube créé avec succès');
    } catch (error) {
        console.error('Erreur lors de la création du fichier cookies:', error);
    }
} 