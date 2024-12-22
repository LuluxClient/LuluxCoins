import fs from 'fs/promises';

export async function extractYoutubeCookies() {
    try {
        // Format Netscape avec des cookies YouTube valides
        const cookieContent = `# Netscape HTTP Cookie File
# http://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file!  Do not edit.

.youtube.com	TRUE	/	TRUE	1769467204	PREF	tz=Europe.Paris
.youtube.com	TRUE	/	TRUE	1769035193	SOCS	CAISEwgDEgk3MDc3MDg4MjQaAmZyIAEaBgiArZ27Bg
.youtube.com	TRUE	/	TRUE	1750459193	VISITOR_INFO1_LIVE	bDLtKHIGHCo
.youtube.com	TRUE	/	TRUE	1734908993	GPS	1
.youtube.com	TRUE	/	TRUE	0	YSC	VlG4luYpXM0
.youtube.com	TRUE	/	TRUE	1750459203	VISITOR_INFO1_LIVE	liNZp-VoQlE
.youtube.com	TRUE	/	TRUE	1750459203	VISITOR_PRIVACY_METADATA	CgJGUhIcEhgSFhMLFBUWFwwYGRobHB0eHw4PIBAREiEgTg%3D%3D
`;

        await fs.writeFile('/root/cookies.txt', cookieContent);
        console.log('Fichier de cookies YouTube créé avec succès');
    } catch (error) {
        console.error('Erreur lors de la création du fichier cookies:', error);
    }
} 