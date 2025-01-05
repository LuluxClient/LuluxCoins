import 'dotenv/config';

export const config = {
    token: process.env.BOT_TOKEN!,
    clientId: process.env.CLIENT_ID!,
    staffRoleIds: [process.env.STAFF_ROLE_ID!],
    luluxcoinsEmoji: `<:luluxcoins:${process.env.LULUXCOINS_EMOJI_ID}>`,
    zermikoinsEmoji: `<:zermikoins:${process.env.ZERMIKOINS_EMOJI_ID!}>`,
    ownerID: '295515087731556362',
    openaiApiKey: process.env.OPENAI_API_KEY!,
    shopItems: [
        {
            id: '1',
            name: 'NTM',
            description: 'fils de pute!',
            price: 1000,
            emoji: '👑'
        },
        {
            id: '2',
            name: 'faceit 13',
            description: 'la légende est vrai',
            price: 500,
            emoji: '🎨'
        },
    ],
    musicChannelId: '1320439761873272844',
    forcedNicknames: [
        "le fils de pute offi",
        "l'idiot du village",
        "roux de merde",
        "nigger lover 3000"
    ],
    funnyChannelNames: [
        "bakobakobako",
        "rouxkmoute-de-merde",
        "suce",
        "pov-je-suis-un-salon",
        "faceit-13",
        "ntm",
        "luluxcoins",
        "tu-es-tilté-boubou",
        "inof-INOF-!"
    ]
}; 