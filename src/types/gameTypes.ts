import { User } from 'discord.js';

export interface GamePlayer {
    user: User;
    symbol: string;
}

export interface TicTacToeGame {
    id: string;
    player1: GamePlayer;
    player2: GamePlayer;
    board: string[];
    currentTurn: string;
    wager: number;
    status: GameStatus;
    winner?: GamePlayer;
    createdAt: number;
    lastTurnStarted: number;
}

export enum GameStatus {
    WAITING = 'WAITING',
    IN_PROGRESS = 'IN_PROGRESS',
    FINISHED = 'FINISHED',
    CANCELLED = 'CANCELLED'
}

export enum GameType {
    TIC_TAC_TOE = 'TIC_TAC_TOE'
    // Add more games here in the future
}

export interface GameInvite {
    gameType: GameType;
    challenger: User;
    challenged: User;
    wager: number;
    timestamp: number;
} 