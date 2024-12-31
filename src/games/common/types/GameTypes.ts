import { User } from 'discord.js';

export enum GameStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    FINISHED = 'FINISHED',
    CANCELLED = 'CANCELLED'
}

export enum GameType {
    TICTACTOE = 'MORPION'
    // Ajouter d'autres types de jeux ici
}

export interface GamePlayer {
    user: User;
    symbol?: string;  // Optionnel car tous les jeux n'utilisent pas des symboles
}

export interface BaseGame {
    id: string;
    player1: GamePlayer;
    player2: GamePlayer;
    status: GameStatus;
    wager: number;
    createdAt: number;
    lastTurnStarted: number;
    currentTurn: string;
    winner?: GamePlayer;
}

export interface GameInvite {
    gameType: GameType;
    challenger: User;
    challenged: User;
    wager: number;
    timestamp: number;
} 