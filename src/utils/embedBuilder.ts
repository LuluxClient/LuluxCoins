import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { Transaction, ShopItem, UserData } from '../types/types';
import { config } from '../config';

export class EmbedCreator {
    static createBalanceEmbed(user: UserData) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`Balance de ${user.username}`)
            .setDescription(`**Solde:** ${user.balance.toLocaleString()} ${config.luluxcoinsEmoji}`)
            .setTimestamp();
    }

    static createLeaderboardEmbed(users: UserData[]) {
        const top10 = users
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Classement LuluxCoins')
            .setDescription(
                top10
                    .map((user, index) => 
                        `${index + 1}. ${user.username} - ${config.luluxcoinsEmoji} ${user.balance.toLocaleString()} LuluxCoins`)
                    .join('\n')
            )
            .setTimestamp();
    }

    static createShopEmbed(items: ShopItem[]) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🛍️ Boutique Luluxcoins')
            .setDescription(
                items
                    .map(item => 
                        `${item.emoji} **${item.name}** - ${config.luluxcoinsEmoji} ${item.price.toLocaleString()} LuluxCoins\n` +
                        `┗ ${item.description}\n`)
                    .join('\n')
            )
            .setFooter({ text: 'Utilisez /shop buy <item> pour acheter un objet!' });
    }

    static createTransactionHistoryEmbed(transactions: Transaction[], page: number) {
        const pageSize = 10;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageTransactions = transactions.slice(start, end);

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📜 Historique des Transactions')
            .setDescription(
                pageTransactions
                    .map(t => {
                        const emoji = t.currency === 'zermikoins' ? config.zermikoinsEmoji : config.luluxcoinsEmoji;
                        const date = new Date(t.timestamp).toLocaleString('fr-FR');
                        let description = `[${date}] `;
                        
                        switch (t.type) {
                            case 'add':
                                description += `+${t.amount} ${emoji}`;
                                break;
                            case 'remove':
                                description += `-${t.amount} ${emoji}`;
                                break;
                            case 'set':
                                description += `= ${t.amount} ${emoji}`;
                                break;
                            case 'purchase':
                                description += `Achat: ${t.itemName} (-${t.amount} ${emoji})`;
                                break;
                        }
                        
                        return description;
                    })
                    .join('\n')
            )
            .setFooter({ text: `Page ${page}` })
            .setTimestamp();
    }

    static createPurchaseEmbed(item: ShopItem, user: UserData) {
        return new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛍️ Achat Réussi!')
            .setDescription(
                `Vous avez acheté **${item.name}** ${item.emoji}\n` +
                `Prix: ${config.luluxcoinsEmoji} ${item.price.toLocaleString()} coins\n` +
                `Solde restant: ${config.luluxcoinsEmoji} ${user.balance.toLocaleString()} coins`
            )
            .setTimestamp();
    }

    // Nouveaux embeds pour les commandes luluxcoins
    static createLuluxcoinsActionEmbed(type: 'add' | 'remove', executor: string, target: string, amount: number, newBalance: number) {
        const action = type === 'add' ? 'ajouté' : 'retiré';
        const color = type === 'add' ? '#00FF00' : '#FF0000';
        const emoji = type === 'add' ? config.luluxcoinsEmoji : '💸';

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Transaction Luluxcoins`)
            .setDescription(
                `**${executor}** a ${action} des coins à **${target}**\n\n` +
                `Montant: ${config.luluxcoinsEmoji} **${amount.toLocaleString()}** coins\n` +
                `Nouveau solde: ${config.luluxcoinsEmoji} **${newBalance.toLocaleString()}** coins`
            )
            .setTimestamp();
    }
} 