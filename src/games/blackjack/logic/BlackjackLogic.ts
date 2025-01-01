import { Card, Hand } from '../types/BlackjackTypes';

export class BlackjackLogic {
    static readonly EMPTY_CELL = '';
    static readonly SUITS = ['♠', '♥', '♦', '♣'] as const;
    static readonly VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

    static createDeck(): Card[] {
        const deck: Card[] = [];
        for (const suit of this.SUITS) {
            for (const value of this.VALUES) {
                deck.push({
                    suit,
                    value,
                    numericValue: this.getNumericValue(value),
                    toString() {
                        return `${this.suit}${this.value}`;
                    }
                });
            }
        }
        return this.shuffleDeck(deck);
    }

    static createEmptyHand(): Hand {
        return {
            cards: [],
            value: 0,
            isSoft: false
        };
    }

    static addCardToHand(hand: Hand, card: Card): void {
        hand.cards.push(card);
        this.updateHandValue(hand);
    }

    static dealCard(deck: Card[]): Card {
        if (deck.length === 0) {
            throw new Error('Le deck est vide !');
        }
        return deck.pop()!;
    }

    private static getNumericValue(value: string): number {
        if (value === 'A') return 11;
        if (['J', 'Q', 'K'].includes(value)) return 10;
        return parseInt(value);
    }

    private static updateHandValue(hand: Hand): void {
        let value = 0;
        let aces = 0;
        hand.isSoft = false;
        hand.isNaturalBlackjack = false;

        // Compter d'abord les cartes non-As
        for (const card of hand.cards) {
            if (card.value === 'A') {
                aces++;
            } else {
                value += card.numericValue;
            }
        }

        // Ajouter les As
        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
                hand.isSoft = true;
            } else {
                value += 1;
            }
        }

        hand.value = value;

        // Vérifier si c'est un blackjack naturel (As + 10/J/Q/K)
        if (hand.cards.length === 2 && hand.value === 21) {
            const hasAce = hand.cards.some(card => card.value === 'A');
            const hasTenCard = hand.cards.some(card => card.numericValue === 10);
            hand.isNaturalBlackjack = hasAce && hasTenCard;
        }
    }

    private static shuffleDeck(deck: Card[]): Card[] {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    static canDouble(hand: Hand): boolean {
        return hand.cards.length === 2;
    }

    static canSplit(hand: Hand): boolean {
        return hand.cards.length === 2 && 
               hand.cards[0].numericValue === hand.cards[1].numericValue;
    }

    static shouldDealerHit(hand: Hand): boolean {
        return hand.value < 17 || (hand.value === 17 && hand.isSoft);
    }

    static determineWinner(playerHand: Hand, dealerHand: Hand): 'player' | 'dealer' | 'push' {
        // Si le joueur a un blackjack naturel
        if (playerHand.isNaturalBlackjack) {
            // Si le croupier a aussi un blackjack naturel, c'est une égalité
            if (dealerHand.isNaturalBlackjack) {
                return 'push';
            }
            // Sinon le joueur gagne
            return 'player';
        }
        
        // Si le croupier a un blackjack naturel et pas le joueur, le croupier gagne
        if (dealerHand.isNaturalBlackjack) {
            return 'dealer';
        }

        // Logique standard
        if (playerHand.value > 21) return 'dealer';
        if (dealerHand.value > 21) return 'player';
        if (playerHand.value > dealerHand.value) return 'player';
        if (playerHand.value < dealerHand.value) return 'dealer';
        return 'push';
    }

    static getBotMove(hand: Hand): number {
        // Stratégie de base pour le bot
        if (hand.value < 17) return 1; // Hit
        return 0; // Stand
    }

    static shouldStopAtValue(hand: Hand): boolean {
        return hand.value === 21 || hand.isNaturalBlackjack === true;
    }
} 