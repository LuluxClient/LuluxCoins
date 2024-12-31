import { User } from 'discord.js';
import { GameStatus } from '../../common/types/GameTypes';

export interface Connect4Player {
    user: User | 'LuluxBot';
    symbol: string;
}

export interface Connect4Game {
    id: string;
    player1: Connect4Player;
    player2: Connect4Player;
    board: string[][];
    currentTurn: string;
    status: GameStatus;
    wager: number;
    winner: Connect4Player | null;
    lastMoveTimestamp: number;
} 