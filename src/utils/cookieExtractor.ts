import fs from 'fs/promises';

export async function extractYoutubeCookies() {
    try {
        const cookieContent = `# Netscape HTTP Cookie File
# http://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file!  Do not edit.

.youtube.com	TRUE	/	TRUE	1769468026	PREF	tz=Europe.Paris
.youtube.com	TRUE	/	TRUE	1769035487	SOCS	CAISEwgDEgk3MDc3MDg4MjQaAmZyIAEaBgiArZ27Bg
.youtube.com	TRUE	/	TRUE	1750459487	VISITOR_INFO1_LIVE	EtUEbh0X06g
.youtube.com	TRUE	/	TRUE	1734909287	GPS	1
.youtube.com	TRUE	/	TRUE	1766443605	__Secure-1PSIDTS	sidts-CjIB7wV3sR-gfk2np5kHkabDH5eiOoRz_xGcFwKdjeJwVsgmT6-li45xCoSTSq7lyUvoQBAA
.youtube.com	TRUE	/	TRUE	1766443605	__Secure-3PSIDTS	sidts-CjIB7wV3sR-gfk2np5kHkabDH5eiOoRz_xGcFwKdjeJwVsgmT6-li45xCoSTSq7lyUvoQBAA
.youtube.com	TRUE	/	FALSE	1769467605	HSID	A6D9bmGS44suk0AUE
.youtube.com	TRUE	/	TRUE	1769467605	SSID	AAtEiQZI6JUo7yqew
.youtube.com	TRUE	/	FALSE	1769467605	APISID	f5yt5dVNLVyg1Idz/AWsXVrYiR6UMsNuu4
.youtube.com	TRUE	/	TRUE	1769467605	SAPISID	rOkElp7dxtHnGURd/A--ac58IT02wqTpy5
.youtube.com	TRUE	/	TRUE	1769467605	__Secure-1PAPISID	rOkElp7dxtHnGURd/A--ac58IT02wqTpy5
.youtube.com	TRUE	/	TRUE	1769467605	__Secure-3PAPISID	rOkElp7dxtHnGURd/A--ac58IT02wqTpy5
.youtube.com	TRUE	/	FALSE	1769467605	SID	g.a000rghnbJhcRd2RnG22iNx2xrYnv9Wb3vc2hxztKFxu585UoWJW1prlRn6YW2U9jUkLpI4OpQACgYKAUYSARQSFQHGX2Mi8PN2_KIezFCeiNZUEZPaMhoVAUF8yKoN4ZZQfbOkP4gdTl5b1zss0076
.youtube.com	TRUE	/	TRUE	1769467605	__Secure-1PSID	g.a000rghnbJhcRd2RnG22iNx2xrYnv9Wb3vc2hxztKFxu585UoWJWj8vESYH1-J4xIUTO8iFCswACgYKAZASARQSFQHGX2Mi7Je_O_sbHYQnWSTTrtmPpBoVAUF8yKo9oaP5lkJLU5BRBJouRApB0076
.youtube.com	TRUE	/	TRUE	1769467605	__Secure-3PSID	g.a000rghnbJhcRd2RnG22iNx2xrYnv9Wb3vc2hxztKFxu585UoWJWNbjgMVv3531PKYEc_R6k6AACgYKAbkSARQSFQHGX2Mi-yALRwmoCZzKxvRbOWqOgRoVAUF8yKqxOwcdWzNhwGjIjVWUJ-rW0076
.youtube.com	TRUE	/	TRUE	1769467605	LOGIN_INFO	AFmmF2swRgIhAOb4OIdN7goykzyF5Sw5PTS4DCoO3PX30b9lxuQAqGsxAiEA27IMUIvZrWgr8uW5sSmTEl41E73Myk3YbYPkey_J08Q:QUQ3MjNmeTc2RmtHdGNRcFZxQUItakVKMEhKb1NKZ0libUtsemR5MDFnMXY2WlVUc3hlQi1kTWVhQjJlZEh3dC1YZG1xX1kycWtiSDUzNVdGRXNuT2xLYWswVkU0VFNROWdhZ3NjV2xSelBCY3hweURUaGhXSkc0bjdoR3lSZk1HbC1BaVpzQWJpNktFaDEtN3VXT0FvZG9mdmk1MENqMmRR
.youtube.com	TRUE	/	FALSE	1766444028	SIDCC	AKEyXzUqSMpHFCCX--5LJJbklSeeOjD2XWGyqsrGaVo_VlUaF9zoITedpK_WbJuuk-vF8giA
.youtube.com	TRUE	/	TRUE	1766444028	__Secure-1PSIDCC	AKEyXzW7FoISFgBKFQcB0Na9cx3QRzYG0A61HK2UFDpBARKdBupJ7xQreUo0h467gFiTLUu0bg
.youtube.com	TRUE	/	TRUE	1766444028	__Secure-3PSIDCC	AKEyXzUAZxFd1dg_FYl926j5MGnZUcweY33d-Vky9STYmLTyOwWoVllia3UoVnrjwnfxwWeITg
.youtube.com	TRUE	/	TRUE	0	YSC	1ivdEjbntFw
.youtube.com	TRUE	/	TRUE	1750460024	VISITOR_INFO1_LIVE	6TCZdzneLFE
.youtube.com	TRUE	/	TRUE	1750460024	VISITOR_PRIVACY_METADATA	CgJGUhIcEhgSFhMLFBUWFwwYGRobHB0eHw4PIBAREiEgQA%3D%3D
.youtube.com	TRUE	/	TRUE	1750459605	__Secure-ROLLOUT_TOKEN	CP6hmoeGm7zxJRD-ktK8uryKAxj-ktK8uryKAw%3D%3D`;

        // Assurez-vous que le fichier utilise les bons retours à la ligne pour Unix
        const unixContent = cookieContent.replace(/\r\n/g, '\n');
        await fs.writeFile('/root/cookies.txt', unixContent);
        console.log('Fichier de cookies YouTube créé avec succès');
    } catch (error) {
        console.error('Erreur lors de la création du fichier cookies:', error);
    }
} 