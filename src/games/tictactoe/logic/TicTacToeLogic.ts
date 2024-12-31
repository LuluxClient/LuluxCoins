export class TicTacToeLogic {
    static readonly EMPTY_CELL = '⬜';
    static readonly PLAYER_SYMBOL = '❌';
    static readonly BOT_SYMBOL = '⭕';

    static createEmptyBoard(): string[] {
        return Array(9).fill(this.EMPTY_CELL);
    }

    static checkWinner(board: string[]): string | null {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] !== this.EMPTY_CELL && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }

        return null;
    }

    static isBoardFull(board: string[]): boolean {
        return board.every(cell => cell !== this.EMPTY_CELL);
    }

    static getBotMove(board: string[]): number {
        // First, try to win
        const possibleMoves = board.map((cell, index) => cell === this.EMPTY_CELL ? index : -1).filter(index => index !== -1);
        
        for (const move of possibleMoves) {
            const testBoard = [...board];
            testBoard[move] = this.BOT_SYMBOL;
            if (this.checkWinner(testBoard) === this.BOT_SYMBOL) {
                return move;
            }
        }

        // Then, block player's winning move
        for (const move of possibleMoves) {
            const testBoard = [...board];
            testBoard[move] = this.PLAYER_SYMBOL;
            if (this.checkWinner(testBoard) === this.PLAYER_SYMBOL) {
                return move;
            }
        }

        // Try to take center
        if (board[4] === this.EMPTY_CELL) {
            return 4;
        }

        // Try to take corners
        const corners = [0, 2, 6, 8].filter(i => board[i] === this.EMPTY_CELL);
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }

        // Take any available move
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    static formatBoard(board: string[]): string {
        let result = '';
        for (let i = 0; i < 9; i += 3) {
            result += `${board[i]}${board[i + 1]}${board[i + 2]}\n`;
        }
        return result;
    }
} 