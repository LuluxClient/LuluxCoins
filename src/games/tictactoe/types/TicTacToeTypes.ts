import { User } from 'discord.js';
import { GameStatus } from '../../common/types/GameTypes';

export interface TicTacToePlayer {
    user: User | 'LuluxBot';
    symbol: string;
}

export interface TicTacToeGame {
    id: string;
    player1: TicTacToePlayer;
    player2: TicTacToePlayer;
    board: string[];
    currentTurn: string;
    status: GameStatus;
    wager: number;
    winner: TicTacToePlayer | null;
} 