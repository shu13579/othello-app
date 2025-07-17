/**
 * Othello Game Engine
 * ゲームのロジックとルールを管理
 */
export class OthelloGameEngine {
    constructor() {
        this.board = [];
        this.currentPlayer = 1;
        this.gameMode = 'local';
        this.isOnline = false;
        this.onlinePlayerColor = 1;
        this.opponentName = '';
        this.gameOver = false;
        this.scores = { black: 2, white: 2 };
        
        this.initializeBoard();
    }

    initializeBoard() {
        this.board = Array(8).fill().map(() => Array(8).fill(0));
        this.board[3][3] = 2;
        this.board[3][4] = 1;
        this.board[4][3] = 1;
        this.board[4][4] = 2;
        this.currentPlayer = 1;
        this.gameOver = false;
        this.updateScore();
    }

    makeMove(row, col, skipValidation = false) {
        if (this.gameOver) return false;
        
        if (!skipValidation && !this.isValidMove(row, col, this.currentPlayer)) {
            return false;
        }

        if (this.isOnline && this.currentPlayer !== this.onlinePlayerColor) {
            return false;
        }

        this.board[row][col] = this.currentPlayer;
        this.flipPieces(row, col, this.currentPlayer);
        this.updateScore();

        if (this.checkGameEnd()) {
            this.gameOver = true;
            return { success: true, gameOver: true, winner: this.getWinner() };
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        if (!this.hasValidMoves(this.currentPlayer)) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            if (!this.hasValidMoves(this.currentPlayer)) {
                this.gameOver = true;
                return { success: true, gameOver: true, winner: this.getWinner() };
            }
        }

        return { success: true, gameOver: false };
    }

    isValidMove(row, col, player) {
        if (this.board[row][col] !== 0) return false;

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            if (this.checkDirection(row, col, dx, dy, player)) {
                return true;
            }
        }
        return false;
    }

    checkDirection(row, col, dx, dy, player) {
        let x = row + dx;
        let y = col + dy;
        let hasOpponentPiece = false;

        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
            if (this.board[x][y] === 0) return false;
            if (this.board[x][y] === player) {
                return hasOpponentPiece;
            }
            hasOpponentPiece = true;
            x += dx;
            y += dy;
        }
        return false;
    }

    flipPieces(row, col, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            if (this.checkDirection(row, col, dx, dy, player)) {
                this.flipInDirection(row, col, dx, dy, player);
            }
        }
    }

    flipInDirection(row, col, dx, dy, player) {
        let x = row + dx;
        let y = col + dy;

        while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] !== player) {
            this.board[x][y] = player;
            x += dx;
            y += dy;
        }
    }

    hasValidMoves(player) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, player)) {
                    return true;
                }
            }
        }
        return false;
    }

    getValidMoves(player) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, player)) {
                    moves.push({ row, col });
                }
            }
        }
        return moves;
    }

    updateScore() {
        let black = 0, white = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === 1) black++;
                else if (this.board[row][col] === 2) white++;
            }
        }
        this.scores = { black, white };
    }

    checkGameEnd() {
        return !this.hasValidMoves(1) && !this.hasValidMoves(2);
    }

    getWinner() {
        if (this.scores.black > this.scores.white) return 'black';
        if (this.scores.white > this.scores.black) return 'white';
        return 'tie';
    }

    setGameMode(mode) {
        this.gameMode = mode;
    }

    setOnlineMode(isOnline, playerColor, opponentName = '') {
        this.isOnline = isOnline;
        this.onlinePlayerColor = playerColor;
        this.opponentName = opponentName;
    }

    getGameState() {
        return {
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            scores: { ...this.scores },
            gameOver: this.gameOver,
            gameMode: this.gameMode,
            isOnline: this.isOnline,
            onlinePlayerColor: this.onlinePlayerColor,
            opponentName: this.opponentName
        };
    }

    loadGameState(state) {
        this.board = state.board.map(row => [...row]);
        this.currentPlayer = state.currentPlayer;
        this.scores = { ...state.scores };
        this.gameOver = state.gameOver;
        this.gameMode = state.gameMode;
        this.isOnline = state.isOnline;
        this.onlinePlayerColor = state.onlinePlayerColor;
        this.opponentName = state.opponentName;
    }
}

/**
 * AI Player for Othello
 * シンプルなAIプレイヤーの実装
 */
export class OthelloAI {
    static makeMove(gameEngine, difficulty = 'normal') {
        const validMoves = gameEngine.getValidMoves(gameEngine.currentPlayer);
        if (validMoves.length === 0) return null;

        switch (difficulty) {
            case 'easy':
                return this.randomMove(validMoves);
            case 'normal':
                return this.greedyMove(gameEngine, validMoves);
            case 'hard':
                return this.strategicMove(gameEngine, validMoves);
            default:
                return this.greedyMove(gameEngine, validMoves);
        }
    }

    static randomMove(validMoves) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    static greedyMove(gameEngine, validMoves) {
        let bestMove = validMoves[0];
        let maxFlips = 0;

        for (const move of validMoves) {
            const flips = this.countFlips(gameEngine, move.row, move.col, gameEngine.currentPlayer);
            if (flips > maxFlips) {
                maxFlips = flips;
                bestMove = move;
            }
        }
        return bestMove;
    }

    static strategicMove(gameEngine, validMoves) {
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: 7 },
            { row: 7, col: 0 }, { row: 7, col: 7 }
        ];

        for (const move of validMoves) {
            if (corners.some(corner => corner.row === move.row && corner.col === move.col)) {
                return move;
            }
        }

        const edges = validMoves.filter(move => 
            move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7
        );

        if (edges.length > 0) {
            return this.greedyMove(gameEngine, edges);
        }

        return this.greedyMove(gameEngine, validMoves);
    }

    static countFlips(gameEngine, row, col, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        let totalFlips = 0;
        for (const [dx, dy] of directions) {
            if (gameEngine.checkDirection(row, col, dx, dy, player)) {
                let x = row + dx;
                let y = col + dy;
                while (x >= 0 && x < 8 && y >= 0 && y < 8 && gameEngine.board[x][y] !== player) {
                    totalFlips++;
                    x += dx;
                    y += dy;
                }
            }
        }
        return totalFlips;
    }
}