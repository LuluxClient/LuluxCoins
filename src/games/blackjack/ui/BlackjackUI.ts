import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { BlackjackGame } from '../types/BlackjackTypes';
import { GameStatus } from '../../common/types/GameTypes';
import { config } from '../../../config';

export class BlackjackUI {
    static createGameButtons(game: BlackjackGame): ActionRowBuilder<ButtonBuilder>[] {
        if (game.status !== GameStatus.IN_PROGRESS || game.playerStands) {
            return [];
        }

        const row = new ActionRowBuilder<ButtonBuilder>();

        // Bouton Hit
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`hit_blackjack_${game.id}`)
                .setLabel(`HIT${game.player.splitHand ? ` (Main ${game.currentHand === 'main' ? '1' : '2'})` : ''}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👊')
        );

        // Bouton Stand
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`stand_blackjack_${game.id}`)
                .setLabel(`STAND${game.player.splitHand ? ` (Main ${game.currentHand === 'main' ? '1' : '2'})` : ''}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🛑')
        );

        // Bouton Double si possible
        if (game.canDouble) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`double_blackjack_${game.id}`)
                    .setLabel(`DOUBLE${game.player.splitHand ? ` (Main ${game.currentHand === 'main' ? '1' : '2'})` : ''}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💰')
            );
        }

        // Bouton Split si possible
        if (game.canSplit) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`split_blackjack_${game.id}`)
                    .setLabel('SPLIT')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✂️')
            );
        }

        return [row];
    }

    static createGameEmbed(game: BlackjackGame): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setTitle('🎰 Blackjack')
            .setColor('#FFD700')
            .setDescription('Battez le croupier en vous approchant le plus possible de 21 sans dépasser !');

        // Main du croupier
        let dealerHandStr = '';
        let dealerValue = '?';
        if (game.status === GameStatus.IN_PROGRESS && !game.playerStands) {
            // Pendant le jeu, on cache la deuxième carte
            dealerHandStr = `${game.dealer.hand.cards[0]} | 🎴`;
            dealerValue = `${game.dealer.hand.cards[0].numericValue}`;
        } else {
            // À la fin ou quand le joueur a stand, on montre toutes les cartes
            dealerHandStr = game.dealer.hand.cards.map(card => card.toString()).join(' | ');
            dealerValue = `${game.dealer.hand.value}${game.dealer.hand.isNaturalBlackjack ? ' BLACKJACK!' : ''}`;
        }

        // Ligne de séparation pour le croupier
        embed.addFields({ 
            name: '┏━━━━━ 🎩 Main du Croupier ━━━━━┓', 
            value: `${dealerHandStr}\n📊 Valeur: ${dealerValue}`,
            inline: false 
        });

        // Ligne de séparation pour le joueur
        embed.addFields({ 
            name: '┏━━━━━ 🎮 Vos Mains ━━━━━┓', 
            value: '\u200B',
            inline: false 
        });

        // Main principale du joueur
        const mainHandActive = game.player.splitHand && game.currentHand === 'main';
        embed.addFields({ 
            name: `${mainHandActive ? '▶️' : ''}Main ${game.player.splitHand ? '1' : 'Actuelle'}`, 
            value: `${game.player.hand.cards.map(card => card.toString()).join(' | ')}\n📊 Valeur: ${game.player.hand.value}${game.player.hand.isSoft ? ' (Soft)' : ''}${game.player.hand.isNaturalBlackjack ? ' BLACKJACK!' : ''}`,
            inline: false 
        });

        // Si le joueur a splitté, afficher la deuxième main
        if (game.player.splitHand) {
            const splitHandActive = game.currentHand === 'split';
            embed.addFields({ 
                name: `${splitHandActive ? '▶️' : ''}Main 2`, 
                value: `${game.player.splitHand.cards.map(card => card.toString()).join(' | ')}\n📊 Valeur: ${game.player.splitHand.value}${game.player.splitHand.isSoft ? ' (Soft)' : ''}${game.player.splitHand.isNaturalBlackjack ? ' BLACKJACK!' : ''}`,
                inline: false 
            });
        }

        // Ligne de séparation pour les infos
        embed.addFields({ 
            name: '┏━━━━━ 💰 Informations ━━━━━┓', 
            value: `Mise: ${game.wager} ${config.luluxcoinsEmoji}`,
            inline: false 
        });

        // Afficher le résultat si la partie est terminée
        if (game.status === GameStatus.FINISHED) {
            let resultStr = '';
            if (game.winner === 'player') {
                resultStr = `🎉 Vous avez gagné ${game.wager * 2} ${config.luluxcoinsEmoji} !`;
            } else if (game.winner === 'dealer') {
                resultStr = '💀 Le croupier gagne.';
            } else {
                resultStr = `🤝 Égalité ! Votre mise de ${game.wager} ${config.luluxcoinsEmoji} vous est rendue.`;
            }
            embed.addFields({ 
                name: '┏━━━━━ 🏆 Résultat ━━━━━┓', 
                value: resultStr, 
                inline: false 
            });
        }

        return embed;
    }
} 