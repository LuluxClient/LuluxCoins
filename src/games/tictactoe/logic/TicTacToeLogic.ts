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
        // 5% de chance de jouer aléatoirement
        if (Math.random() < 0.1) {
            const availableMoves = board
                .map((cell, index) => cell === this.EMPTY_CELL ? index : -1)
                .filter(index => index !== -1);
            
            if (availableMoves.length > 0) {
                return availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }

        // Sinon, jouer intelligemment
        // Vérifier si on peut gagner
        for (let i = 0; i < board.length; i++) {
            if (board[i] === this.EMPTY_CELL) {
                board[i] = '⭕';
                if (this.checkWinner(board)) {
                    board[i] = this.EMPTY_CELL;
                    return i;
                }
                board[i] = this.EMPTY_CELL;
            }
        }

        // Vérifier si l'adversaire peut gagner et le bloquer
        for (let i = 0; i < board.length; i++) {
            if (board[i] === this.EMPTY_CELL) {
                board[i] = '❌';
                if (this.checkWinner(board)) {
                    board[i] = this.EMPTY_CELL;
                    return i;
                }
                board[i] = this.EMPTY_CELL;
            }
        }

        // Jouer au centre si possible
        if (board[4] === this.EMPTY_CELL) {
            return 4;
        }

        // Jouer dans un coin
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(i => board[i] === this.EMPTY_CELL);
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }

        // Jouer sur un côté
        const sides = [1, 3, 5, 7];
        const availableSides = sides.filter(i => board[i] === this.EMPTY_CELL);
        if (availableSides.length > 0) {
            return availableSides[Math.floor(Math.random() * availableSides.length)];
        }

        // Si aucun coup n'est possible, retourner -1
        return -1;
    }

    static formatBoard(board: string[]): string {
        let result = '';
        for (let i = 0; i < 9; i += 3) {
            result += `${board[i]}${board[i + 1]}${board[i + 2]}\n`;
        }
        return result;
    }
} 