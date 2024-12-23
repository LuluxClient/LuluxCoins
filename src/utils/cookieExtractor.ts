import fs from 'fs/promises';
import path from 'path';

export async function extractYoutubeCookies() {
    try {
        console.log('Starting YouTube cookie setup...');
        
        // Path for the cookies file
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');
        
        // Create a basic cookie file with Netscape format
        const cookieContent = `# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file!  Do not edit.

.youtube.com	TRUE	/	TRUE	2324869548	CONSENT	PENDING+355
.youtube.com	TRUE	/	TRUE	2324869548	VISITOR_INFO1_LIVE	${generateRandomString(11)}
.youtube.com	TRUE	/	TRUE	2324869548	YSC	${generateRandomString(11)}
.youtube.com	TRUE	/	TRUE	2324869548	GPS	1
`;

        await fs.writeFile(cookiesPath, cookieContent);
        await fs.chmod(cookiesPath, '644');

        console.log('Cookie file created successfully');
        return cookiesPath;
    } catch (error) {
        console.error('Error creating cookie file:', error);
        throw error;
    }
}

function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
} 