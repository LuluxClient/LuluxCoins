import 'dotenv/config';

export const config = {
    token: process.env.BOT_TOKEN!,
    clientId: process.env.CLIENT_ID!,
    staffRoleIds: [process.env.STAFF_ROLE_ID!],
    luluxcoinsEmoji: `<:luluxcoins:${process.env.LULUXCOINS_EMOJI_ID}>`,
    ownerID: '295515087731556362',
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
    vendettaDox: {
        countdownChannelId: '1179116200073117716',
        christmasDate: '2024-12-25T00:00:00',
        doxInfo: [
            {
                type: 'message',
                content: 'Premier dox sur Vendetta...'
            },
            {
                type: 'image',
                content: 'URL_DE_L_IMAGE_1'
            },
            {
                type: 'message',
                content: 'Deuxième révélation choquante...'
            },
            {
                type: 'link',
                content: 'https://example.com/evidence1'
            }
        ],
        finalLink: 'https://example.com/vendetta-full-dox-2024'
    }
}; 