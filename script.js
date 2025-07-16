class OthelloGame {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(0));
        this.currentPlayer = 1; // 1 = 黒, 2 = 白
        this.directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        this.initializeGame();
    }

    initializeGame() {
        // 初期配置
        this.board[3][3] = 2; // 白
        this.board[3][4] = 1; // 黒
        this.board[4][3] = 1; // 黒
        this.board[4][4] = 2; // 白
        
        this.renderBoard();
        this.updateUI();
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.onclick = () => this.makeMove(row, col);

                if (this.board[row][col] !== 0) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.board[row][col] === 1 ? 'black' : 'white'}`;
                    cell.appendChild(piece);
                } else if (this.isValidMove(row, col, this.currentPlayer)) {
                    cell.classList.add('valid-move');
                }

                boardElement.appendChild(cell);
            }
        }
    }

    isValidMove(row, col, player) {
        if (this.board[row][col] !== 0) return false;

        for (const [dr, dc] of this.directions) {
            if (this.checkDirection(row, col, dr, dc, player)) {
                return true;
            }
        }
        return false;
    }

    checkDirection(row, col, dr, dc, player) {
        const opponent = player === 1 ? 2 : 1;
        let r = row + dr;
        let c = col + dc;
        let hasOpponent = false;

        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (this.board[r][c] === opponent) {
                hasOpponent = true;
            } else if (this.board[r][c] === player && hasOpponent) {
                return true;
            } else {
                break;
            }
            r += dr;
            c += dc;
        }
        return false;
    }

    makeMove(row, col) {
        if (!this.isValidMove(row, col, this.currentPlayer)) {
            return false;
        }

        this.board[row][col] = this.currentPlayer;

        // 駒をひっくり返す
        for (const [dr, dc] of this.directions) {
            this.flipPieces(row, col, dr, dc, this.currentPlayer);
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        // 次のプレイヤーが打てる手があるかチェック
        if (!this.hasValidMoves(this.currentPlayer)) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            if (!this.hasValidMoves(this.currentPlayer)) {
                this.endGame();
                return;
            }
        }

        this.renderBoard();
        this.updateUI();
        return true;
    }

    flipPieces(row, col, dr, dc, player) {
        const opponent = player === 1 ? 2 : 1;
        const piecesToFlip = [];
        let r = row + dr;
        let c = col + dc;

        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (this.board[r][c] === opponent) {
                piecesToFlip.push([r, c]);
            } else if (this.board[r][c] === player) {
                for (const [fr, fc] of piecesToFlip) {
                    this.board[fr][fc] = player;
                }
                break;
            } else {
                break;
            }
            r += dr;
            c += dc;
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

    getScore() {
        let black = 0, white = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === 1) black++;
                else if (this.board[row][col] === 2) white++;
            }
        }
        return { black, white };
    }

    updateUI() {
        const currentPlayerElement = document.getElementById('current-player');
        currentPlayerElement.textContent = this.currentPlayer === 1 ? '黒' : '白';
        
        const score = this.getScore();
        document.getElementById('black-score').textContent = `黒: ${score.black}`;
        document.getElementById('white-score').textContent = `白: ${score.white}`;
    }

    endGame() {
        const score = this.getScore();
        let winner;
        if (score.black > score.white) {
            winner = '黒の勝利！';
        } else if (score.white > score.black) {
            winner = '白の勝利！';
        } else {
            winner = '引き分け！';
        }
        
        setTimeout(() => {
            alert(`ゲーム終了！\n${winner}\n黒: ${score.black}, 白: ${score.white}`);
        }, 100);
    }
}

let game;

function resetGame() {
    game = new OthelloGame();
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    game = new OthelloGame();
});