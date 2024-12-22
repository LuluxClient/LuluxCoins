import fs from 'fs/promises';

export async function extractYoutubeCookies() {
    try {
        const cookieContent = `# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file!  Do not edit.

.youtube.com	TRUE	/	TRUE	2597573456	CONSENT	YES+
.youtube.com	TRUE	/	TRUE	2597573456	PREF	tz=Europe.Paris
`;
        
        await fs.writeFile('/root/cookies.txt', cookieContent);
        console.log('Fichier de cookies YouTube créé avec succès');
    } catch (error) {
        console.error('Erreur lors de la création du fichier cookies:', error);
    }
} 