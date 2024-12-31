export class Connect4Logic {
    static readonly ROWS = 6;
    static readonly COLS = 7;
    static readonly PLAYER_SYMBOLS = ['🔴', '🟡'];
    static readonly EMPTY_CELL = '⚪';

    static createEmptyBoard(): string[][] {
        return Array(this.ROWS).fill(null)
            .map(() => Array(this.COLS).fill(this.EMPTY_CELL));
    }

    static isValidMove(board: string[][], column: number): boolean {
        return column >= 0 && column < this.COLS && board[0][column] === this.EMPTY_CELL;
    }

    static getNextAvailableRow(board: string[][], column: number): number {
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (board[row][column] === this.EMPTY_CELL) {
                return row;
            }
        }
        return -1;
    }

    static checkWinner(board: string[][]): boolean {
        // Vérifier les lignes horizontales
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col <= this.COLS - 4; col++) {
                if (board[row][col] !== this.EMPTY_CELL &&
                    board[row][col] === board[row][col + 1] &&
                    board[row][col] === board[row][col + 2] &&
                    board[row][col] === board[row][col + 3]) {
                    return true;
                }
            }
        }

        // Vérifier les lignes verticales
        for (let row = 0; row <= this.ROWS - 4; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (board[row][col] !== this.EMPTY_CELL &&
                    board[row][col] === board[row + 1][col] &&
                    board[row][col] === board[row + 2][col] &&
                    board[row][col] === board[row + 3][col]) {
                    return true;
                }
            }
        }

        // Vérifier les diagonales (haut-gauche vers bas-droite)
        for (let row = 0; row <= this.ROWS - 4; row++) {
            for (let col = 0; col <= this.COLS - 4; col++) {
                if (board[row][col] !== this.EMPTY_CELL &&
                    board[row][col] === board[row + 1][col + 1] &&
                    board[row][col] === board[row + 2][col + 2] &&
                    board[row][col] === board[row + 3][col + 3]) {
                    return true;
                }
            }
        }

        // Vérifier les diagonales (haut-droite vers bas-gauche)
        for (let row = 0; row <= this.ROWS - 4; row++) {
            for (let col = this.COLS - 1; col >= 3; col--) {
                if (board[row][col] !== this.EMPTY_CELL &&
                    board[row][col] === board[row + 1][col - 1] &&
                    board[row][col] === board[row + 2][col - 2] &&
                    board[row][col] === board[row + 3][col - 3]) {
                    return true;
                }
            }
        }

        return false;
    }

    static isBoardFull(board: string[][]): boolean {
        return board[0].every(cell => cell !== this.EMPTY_CELL);
    }

    private static evaluateWindow(window: string[], symbol: string): number {
        const opponent = symbol === this.PLAYER_SYMBOLS[0] ? this.PLAYER_SYMBOLS[1] : this.PLAYER_SYMBOLS[0];
        const symbolCount = window.filter(cell => cell === symbol).length;
        const emptyCount = window.filter(cell => cell === this.EMPTY_CELL).length;
        const opponentCount = window.filter(cell => cell === opponent).length;

        if (symbolCount === 4) return 100;
        if (symbolCount === 3 && emptyCount === 1) return 5;
        if (symbolCount === 2 && emptyCount === 2) return 2;
        if (opponentCount === 3 && emptyCount === 1) return 4; // Bloquer l'adversaire
        return 0;
    }

    private static evaluatePosition(board: string[][], symbol: string): number {
        let score = 0;

        // Évaluer le centre (préférer les positions centrales)
        const centerArray = board.map(row => row[Math.floor(this.COLS/2)]);
        const centerCount = centerArray.filter(cell => cell === symbol).length;
        score += centerCount * 3;

        // Évaluer horizontalement
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col <= this.COLS-4; col++) {
                const window = board[row].slice(col, col + 4);
                score += this.evaluateWindow(window, symbol);
            }
        }

        // Évaluer verticalement
        for (let col = 0; col < this.COLS; col++) {
            for (let row = 0; row <= this.ROWS-4; row++) {
                const window = [
                    board[row][col],
                    board[row+1][col],
                    board[row+2][col],
                    board[row+3][col]
                ];
                score += this.evaluateWindow(window, symbol);
            }
        }

        // Évaluer diagonalement (/)
        for (let row = 0; row <= this.ROWS-4; row++) {
            for (let col = 0; col <= this.COLS-4; col++) {
                const window = [
                    board[row][col],
                    board[row+1][col+1],
                    board[row+2][col+2],
                    board[row+3][col+3]
                ];
                score += this.evaluateWindow(window, symbol);
            }
        }

        // Évaluer diagonalement (\)
        for (let row = 0; row <= this.ROWS-4; row++) {
            for (let col = this.COLS-1; col >= 3; col--) {
                const window = [
                    board[row][col],
                    board[row+1][col-1],
                    board[row+2][col-2],
                    board[row+3][col-3]
                ];
                score += this.evaluateWindow(window, symbol);
            }
        }

        return score;
    }

    private static minimax(board: string[][], depth: number, maximizingPlayer: boolean): number {
        const botSymbol = this.PLAYER_SYMBOLS[1];
        const playerSymbol = this.PLAYER_SYMBOLS[0];

        // Vérifier si c'est un état terminal
        if (this.checkWinner(board)) {
            if (maximizingPlayer) return -1000;
            return 1000;
        }
        if (this.isBoardFull(board)) return 0;
        if (depth === 0) return this.evaluatePosition(board, botSymbol);

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (let col = 0; col < this.COLS; col++) {
                if (this.isValidMove(board, col)) {
                    const row = this.getNextAvailableRow(board, col);
                    board[row][col] = botSymbol;
                    const evaluation = this.minimax(board, depth - 1, false);
                    board[row][col] = this.EMPTY_CELL;
                    maxEval = Math.max(maxEval, evaluation);
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let col = 0; col < this.COLS; col++) {
                if (this.isValidMove(board, col)) {
                    const row = this.getNextAvailableRow(board, col);
                    board[row][col] = playerSymbol;
                    const evaluation = this.minimax(board, depth - 1, true);
                    board[row][col] = this.EMPTY_CELL;
                    minEval = Math.min(minEval, evaluation);
                }
            }
            return minEval;
        }
    }

    static getBotMove(board: string[][]): number {
        // 1. Vérifier si le bot peut gagner au prochain coup
        for (let col = 0; col < this.COLS; col++) {
            if (this.isValidMove(board, col)) {
                const row = this.getNextAvailableRow(board, col);
                board[row][col] = this.PLAYER_SYMBOLS[1];
                if (this.checkWinner(board)) {
                    board[row][col] = this.EMPTY_CELL;
                    return col;
                }
                board[row][col] = this.EMPTY_CELL;
            }
        }

        // 2. Bloquer l'adversaire s'il peut gagner au prochain coup
        for (let col = 0; col < this.COLS; col++) {
            if (this.isValidMove(board, col)) {
                const row = this.getNextAvailableRow(board, col);
                board[row][col] = this.PLAYER_SYMBOLS[0];
                if (this.checkWinner(board)) {
                    board[row][col] = this.EMPTY_CELL;
                    return col;
                }
                board[row][col] = this.EMPTY_CELL;
            }
        }

        // 3. Utiliser minimax pour trouver le meilleur coup
        let bestScore = -Infinity;
        let bestMove = 3; // Par défaut, jouer au centre
        const depth = 5; // Profondeur de recherche

        for (let col = 0; col < this.COLS; col++) {
            if (this.isValidMove(board, col)) {
                const row = this.getNextAvailableRow(board, col);
                board[row][col] = this.PLAYER_SYMBOLS[1];
                const score = this.minimax(board, depth, false);
                board[row][col] = this.EMPTY_CELL;

                // Ajouter un bonus pour les colonnes centrales
                const centralityBonus = Math.abs(3 - col) * -0.1;
                const finalScore = score + centralityBonus;

                if (finalScore > bestScore) {
                    bestScore = finalScore;
                    bestMove = col;
                }
            }
        }

        return bestMove;
    }
} 