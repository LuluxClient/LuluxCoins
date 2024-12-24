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
                type: 'image',
                content: 'https://s1.static-footeo.com/1200/uploads/us-arcey-foot/players/valentin-cartier7__pcp130.jpg',
                title: 'Nom prénom: Valention Cartier'
            },
            {
                type: 'image',
                image: 'https://i.gyazo.com/c6c5ce9624124653a35be22fc159a95c.jpg',
                title: 'Adresse: Joydevpur - Tangail - Jamalpur Hwy Inde'
            },
            {
                type: 'image',
                image: 'https://reporterre.net/local/cache-gd2/94/2fca9f5205a481457f57f2070c19f9.jpg?1730141535',
                title: 'Date de naissance: 11 Septembre 2001 New York (il a 23 ans pour les autistes)'
            },
            {
                type: 'image',
                image: 'https://www.digitaltrends.com/wp-content/uploads/2023/12/Fortnite_20231204125818.jpg?resize=1000%2C600&p=1',
                title: 'Numéro de téléphone: 02 43 95 00 17'
            },
            {
                type: 'image',
                content: 'https://www.francebleu.fr/s3/cruiser-production/2022/02/1e6c8272-d0b4-4a2f-a033-dd13ae3a2c8d/1200x680_000_1b03ma.webp',
                title: 'Le daron'
            },
            {
                type: 'link',
                content: 'https://www.youtube.com/@vendettaQ_Q.',
                title: 'Sa chaine Youtube'
            }
        ],
        finalLink: 'https://docs.google.com/document/d/147GYeAkBiwEujJLIhjz2dmgWYluDTE_F9Uh6PRkysnE/edit?usp=sharing'
    } as VendettaDoxConfig
}; 