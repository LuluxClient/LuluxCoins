import { User } from 'discord.js';
import { GameStatus } from '../../common/types/GameTypes';

export interface Card {
    suit: '♠' | '♥' | '♦' | '♣';
    value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
    numericValue: number;
    toString(): string;
}

export interface Hand {
    cards: Card[];
    value: number;
    isSoft: boolean;
    isNaturalBlackjack?: boolean;
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
    player: BlackjackPlayer;
    dealer: BlackjackDealer;
    deck: Card[];
    status: GameStatus;
    winner: 'player' | 'dealer' | 'tie' | null;
    wager: number;
    playerStands: boolean;
    canDouble: boolean;
    canSplit: boolean;
    currentHand: 'main' | 'split';
    lastMoveTimestamp: number;
} 