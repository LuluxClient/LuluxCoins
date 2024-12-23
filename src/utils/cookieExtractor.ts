import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export async function extractYoutubeCookies() {
    try {
        console.log('Starting YouTube cookie extraction...');
        
        // Path for the cookies file
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');
        
        // Extract cookies from Chrome/Chromium
        try {
            execSync(`yt-dlp --cookies-from-browser chrome --cookies "${cookiesPath}"`, {
                stdio: 'pipe'
            });
            console.log('Successfully extracted cookies from Chrome');
        } catch (chromeError) {
            console.log('Failed to extract from Chrome, trying Firefox...');
            try {
                execSync(`yt-dlp --cookies-from-browser firefox --cookies "${cookiesPath}"`, {
                    stdio: 'pipe'
                });
                console.log('Successfully extracted cookies from Firefox');
            } catch (firefoxError) {
                console.error('Failed to extract cookies from both Chrome and Firefox:', firefoxError);
                throw new Error('Could not extract cookies from any browser');
            }
        }

        // Verify the cookies file exists and has content
        const cookiesContent = await fs.readFile(cookiesPath, 'utf-8');
        if (!cookiesContent.includes('youtube.com')) {
            throw new Error('No YouTube cookies found in extracted cookies');
        }

        console.log('Cookie extraction completed successfully');
        return cookiesPath;
    } catch (error) {
        console.error('Error during cookie extraction:', error);
        throw error;
    }
} 