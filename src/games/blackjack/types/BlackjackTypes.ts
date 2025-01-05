import { User } from 'discord.js';
import { GameStatus } from '../../common/types/GameTypes';

export interface Card {
    suit: '♠' | '♥' | '♦' | '♣';
    value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
    numericValue: number;
    toString(): string;
}

export class Hand {
    cards: Card[] = [];
    value: number = 0;
    isSoft: boolean = false;
    isNaturalBlackjack?: boolean = false;
    wager?: number;

    constructor() {
        this.cards = [];
        this.value = 0;
        this.isSoft = false;
        this.isNaturalBlackjack = false;
    }

    addCard(card: Card): void {
        this.cards.push(card);
        this.updateValue();
    }

    private updateValue(): void {
        let value = 0;
        let aces = 0;
        this.isSoft = false;

        // Count non-ace cards first
        for (const card of this.cards) {
            if (card.value === 'A') {
                aces++;
            } else {
                value += card.numericValue;
            }
        }

        // Add aces
        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
                this.isSoft = true;
            } else {
                value += 1;
            }
        }

        this.value = value;

        // Check for natural blackjack
        if (this.cards.length === 2 && this.value === 21) {
            const hasAce = this.cards.some(card => card.value === 'A');
            const hasTenCard = this.cards.some(card => card.numericValue === 10);
            this.isNaturalBlackjack = hasAce && hasTenCard;
        }
    }
}

export interface BlackjackPlayer {
    user: User | 'LuluxBot';
    hand: Hand;
    splitHand: Hand | null;
}

export interface BlackjackDealer {
    hand: Hand;
    hiddenCard: boolean;
}

export interface BlackjackGame {
    id: string;
    player: {
        user: User | 'LuluxBot';
        hand: Hand;
        splitHand: Hand | null;
    };
    dealer: {
        hand: Hand;
        hiddenCard: boolean;
    };
    deck: Card[];
    status: GameStatus;
    winner: 'player' | 'dealer' | 'tie' | null;
    wager: number;
    initialWager: number;
    playerStands: boolean;
    canDouble: boolean;
    canSplit: boolean;
    currentHand: 'main' | 'split';
    lastMoveTimestamp: number;
} 