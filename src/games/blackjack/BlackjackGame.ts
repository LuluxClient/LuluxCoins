import { User } from 'discord.js';
import { GameStatus } from '../common/types/GameTypes';
import { Hand } from './types/BlackjackTypes';

export class BlackjackGame {
    player: { user: User | "LuluxBot"; hand: Hand; splitHand: Hand | null; };
    dealer: { hand: Hand; };
    wager: number;
    status: GameStatus;
    winner: 'player' | 'dealer' | 'tie' | null = null;

    constructor(player: User | "LuluxBot", wager: number) {
        this.player = { user: player, hand: new Hand(), splitHand: null };
        this.dealer = { hand: new Hand() };
        this.wager = wager;
        this.status = GameStatus.IN_PROGRESS;
    }
} 