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
    ]
}; 