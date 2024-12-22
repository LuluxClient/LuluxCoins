import fs from 'fs/promises';

export async function extractYoutubeCookies() {
    try {
        // Format Netscape avec des cookies YouTube valides
        const cookieContent = `# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This file is generated by yt-dlp.  Do not edit.

.youtube.com	TRUE	/	TRUE	2597573456	CONSENT	YES+cb
.youtube.com	TRUE	/	TRUE	2597573456	VISITOR_INFO1_LIVE	y-NbKIDtRsM
.youtube.com	TRUE	/	TRUE	2597573456	LOGIN_INFO	AFmmF2swRQIhALwPWYHoOoHVaXrSvYvxeHkaJzHwYKqFB4VBhFKN-qQaAiA0vEBWSe_w_B4BXnNZuXKuwqcX3X3st5Ml5zKgTCKQQQ:QUQ3MjNmeXlGMDNwM0JQNHBhWGxHY1RxWUZGOWR3MmFwRzFzYmRKQXNXYjZkRDhDTmJ4Y0lQUzFpb2tMNmJHcWJXRnBOUHVGRmRyNWFhTnJPWnYtRFhKYTRBWHFmWGVWQXJJZFY4NmFHRnJmY0JyQUhZRmRVdVBWRmFLYnNDNmFVWEFLMEFqVnhPdw==
.youtube.com	TRUE	/	TRUE	2597573456	SID	ZQjWY-7_D8volj9pAa4oHHqMHZpv3kWr_MKIwGqxEArXbxaWJGGkMZR6KTVSgBaXWBNqQQ.
.youtube.com	TRUE	/	TRUE	2597573456	__Secure-1PSID	ZQjWY-7_D8volj9pAa4oHHqMHZpv3kWr_MKIwGqxEArXbxaWDFG7_KgPPSvbZq0D1kc1Yw.
.youtube.com	TRUE	/	TRUE	2597573456	HSID	AKHYpJLzYxuONEF_x
.youtube.com	TRUE	/	TRUE	2597573456	SSID	AUDxi1FWv-1oPQnwr
.youtube.com	TRUE	/	TRUE	2597573456	APISID	IS0UuhHYxPZOREsv/AsVI5MZZ6B5QNxFUK
.youtube.com	TRUE	/	TRUE	2597573456	SAPISID	y_nZxkVeqP4hKyP5/AaX4HHJDPUtRrGBkN
.youtube.com	TRUE	/	TRUE	2597573456	__Secure-1PAPISID	y_nZxkVeqP4hKyP5/AaX4HHJDPUtRrGBkN
.youtube.com	TRUE	/	TRUE	2597573456	__Secure-3PAPISID	y_nZxkVeqP4hKyP5/AaX4HHJDPUtRrGBkN`;

        await fs.writeFile('/root/cookies.txt', cookieContent);
        console.log('Fichier de cookies YouTube créé avec succès');
    } catch (error) {
        console.error('Erreur lors de la création du fichier cookies:', error);
    }
} 