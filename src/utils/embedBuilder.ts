import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { UserData, Transaction, ShopItem } from '../types/types';
import { config } from '../config';

export class EmbedCreator {
    static createBalanceEmbed(user: UserData) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`Balance de ${user.username}`)
            .setDescription(`**Solde:** ${config.luluxcoinsEmoji} ${user.balance.toLocaleString()} coins`)
            .setTimestamp();
    }

    static createLeaderboardEmbed(users: UserData[]) {
        const top10 = users
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Classement Luluxcoins')
            .setDescription(
                top10
                    .map((user, index) => 
                        `${index + 1}. ${user.username} - ${config.luluxcoinsEmoji} ${user.balance.toLocaleString()} coins`)
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
                        `${item.emoji} **${item.name}** - ${config.luluxcoinsEmoji} ${item.price.toLocaleString()} coins\n` +
                        `┗ ${item.description}\n`)
                    .join('\n')
            )
            .setFooter({ text: 'Utilisez /shop buy <item> pour acheter un objet!' });
    }

    static createTransactionHistoryEmbed(transactions: Transaction[], page: number = 1) {
        const itemsPerPage = 10;
        const maxPage = Math.ceil(transactions.length / itemsPerPage);
        
        page = Math.max(1, Math.min(page, maxPage));
        
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedTransactions = transactions.slice(start, end);

        const description = paginatedTransactions.length > 0
            ? paginatedTransactions
                .map(t => {
                    const date = new Date(t.timestamp).toLocaleString();
                    let description = '';
                    switch (t.type) {
                        case 'add':
                            description = `<@${t.executorId}> a ajouté ${config.luluxcoinsEmoji} ${t.amount} à <@${t.userId}>`;
                            break;
                        case 'remove':
                            description = `<@${t.executorId}> a retiré ${config.luluxcoinsEmoji} ${t.amount} à <@${t.userId}>`;
                            break;
                        case 'set':
                            description = `<@${t.executorId}> a défini le solde de <@${t.userId}> à ${config.luluxcoinsEmoji} ${t.amount}`;
                            break;
                        case 'purchase':
                            description = `<@${t.userId}> a acheté ${t.itemName} pour ${config.luluxcoinsEmoji} ${t.amount}`;
                            break;
                    }
                    return `\`${date}\` ${description}`;
                })
                .join('\n')
            : 'Aucune transaction trouvée pour cette page.';

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📜 Historique des Transactions')
            .setDescription(description)
            .setFooter({ text: `Page ${page}/${maxPage || 1}` });
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
        const emoji = type === 'add' ? '💰' : '💸';

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