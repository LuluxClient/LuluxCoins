import 'dotenv/config';
import { VendettaDoxConfig } from './types/doxTypes';

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
                content: 'Nom prénom: Valention Cartier'
            },
            {
                type: 'image',
                content: 'https://s1.static-footeo.com/1200/uploads/us-arcey-foot/players/valentin-cartier7__pcp130.jpg',
                title: 'Messir vendégras IRL'
            },
            {
                type: 'message',
                content: 'Adresse: Joydevpur - Tangail - Jamalpur Hwy Inde'
            },
            {
                type: 'message',
                content: 'Date de naissance: 11 Septembre 2001 New York'
            },
            {
                type: 'message',
                content: 'Numéro de téléphone: +1234567890'
            },
            {
                type: 'image',
                content: 'https://www.francebleu.fr/s3/cruiser-production/2022/02/1e6c8272-d0b4-4a2f-a033-dd13ae3a2c8d/1200x680_000_1b03ma.webp',
                title: 'Le daron'
            },
            {
                type: 'link',
                content: 'https://example.com/evidence1',
                title: 'Preuve supplémentaire sur Vendetta'
            }
        ],
        finalLink: 'https://example.com/vendetta-full-dox-2024'
    } as VendettaDoxConfig
}; 