class OthelloGame {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(0));
        this.currentPlayer = 1; // 1 = 黒, 2 = 白
        this.gameMode = 'two-player'; // 'two-player', 'ai', or 'online'
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.isAITurn = false;
        this.isOnline = false;
        this.myPlayerColor = 1; // オンライン対戦時の自分の色
        this.opponentName = '';
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
        if (this.isAITurn || !this.isValidMove(row, col, this.currentPlayer)) {
            return false;
        }

        // オンライン対戦の場合、自分のターンかチェック
        if (this.gameMode === 'online' && this.isOnline && this.currentPlayer !== this.myPlayerColor) {
            return false;
        }

        this.board[row][col] = this.currentPlayer;

        // 駒をひっくり返す
        for (const [dr, dc] of this.directions) {
            this.flipPieces(row, col, dr, dc, this.currentPlayer);
        }

        // オンライン対戦の場合、相手に手を送信
        if (this.gameMode === 'online' && this.isOnline) {
            onlineManager.sendMove(row, col);
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

        // AIモードの場合、AIのターンを実行
        if (this.gameMode === 'ai' && this.currentPlayer === 2) {
            this.makeAIMove();
        }

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

    makeAIMove() {
        this.isAITurn = true;
        
        setTimeout(() => {
            const move = this.getBestMove();
            if (move) {
                this.board[move.row][move.col] = this.currentPlayer;
                
                // 駒をひっくり返す
                for (const [dr, dc] of this.directions) {
                    this.flipPieces(move.row, move.col, dr, dc, this.currentPlayer);
                }
                
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                
                // 次のプレイヤーが打てる手があるかチェック
                if (!this.hasValidMoves(this.currentPlayer)) {
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                    if (!this.hasValidMoves(this.currentPlayer)) {
                        this.endGame();
                        this.isAITurn = false;
                        return;
                    }
                }
                
                this.renderBoard();
                this.updateUI();
            }
            
            this.isAITurn = false;
        }, 500); // 0.5秒待機してAIが考えているように見せる
    }

    getBestMove() {
        const validMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, this.currentPlayer)) {
                    validMoves.push({ row, col });
                }
            }
        }
        
        if (validMoves.length === 0) return null;
        
        if (this.difficulty === 'easy') {
            return this.getRandomMove(validMoves);
        } else if (this.difficulty === 'medium') {
            return this.getGreedyMove(validMoves);
        } else {
            return this.getStrategicMove(validMoves);
        }
    }

    getRandomMove(validMoves) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    getGreedyMove(validMoves) {
        let bestMove = validMoves[0];
        let maxFlips = 0;
        
        for (const move of validMoves) {
            const flips = this.countFlips(move.row, move.col, this.currentPlayer);
            if (flips > maxFlips) {
                maxFlips = flips;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    getStrategicMove(validMoves) {
        // コーナーを優先
        const corners = [
            { row: 0, col: 0 }, { row: 0, col: 7 },
            { row: 7, col: 0 }, { row: 7, col: 7 }
        ];
        
        for (const corner of corners) {
            if (validMoves.some(move => move.row === corner.row && move.col === corner.col)) {
                return corner;
            }
        }
        
        // エッジを優先（コーナー隣接を避ける）
        const edges = validMoves.filter(move => {
            const isEdge = move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7;
            const isCornerAdjacent = this.isCornerAdjacent(move.row, move.col);
            return isEdge && !isCornerAdjacent;
        });
        
        if (edges.length > 0) {
            return this.getGreedyMove(edges);
        }
        
        // それ以外はgreedy
        return this.getGreedyMove(validMoves);
    }

    isCornerAdjacent(row, col) {
        const adjacentToCorner = [
            [0, 1], [1, 0], [1, 1], // 左上コーナー隣接
            [0, 6], [1, 6], [1, 7], // 右上コーナー隣接
            [6, 0], [6, 1], [7, 1], // 左下コーナー隣接
            [6, 6], [6, 7], [7, 6]  // 右下コーナー隣接
        ];
        
        return adjacentToCorner.some(([r, c]) => r === row && c === col);
    }

    countFlips(row, col, player) {
        let totalFlips = 0;
        
        for (const [dr, dc] of this.directions) {
            const opponent = player === 1 ? 2 : 1;
            let r = row + dr;
            let c = col + dc;
            let flips = 0;
            
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (this.board[r][c] === opponent) {
                    flips++;
                } else if (this.board[r][c] === player && flips > 0) {
                    totalFlips += flips;
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        return totalFlips;
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this.isAITurn = false;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    // オンライン対戦用メソッド
    receiveMove(row, col) {
        if (this.gameMode !== 'online' || !this.isOnline) return;

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
    }

    setOnlineMode(isOnline, playerColor = 1, opponentName = '') {
        this.isOnline = isOnline;
        this.myPlayerColor = playerColor;
        this.opponentName = opponentName;
    }
}

// オンライン対戦管理クラス
class OnlineManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.playerName = '';
        this.roomId = '';
    }

    async initialize(playerName) {
        this.playerName = playerName;
        try {
            this.peer = new Peer({
                host: 'peerjs-server.herokuapp.com',
                port: 443,
                secure: true,
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                }
            });

            return new Promise((resolve, reject) => {
                this.peer.on('open', (id) => {
                    this.roomId = id;
                    this.updateStatus('オンライン', 'connected');
                    resolve(id);
                });

                this.peer.on('error', (error) => {
                    this.updateStatus('接続エラー', 'error');
                    reject(error);
                });
            });
        } catch (error) {
            this.updateStatus('接続エラー', 'error');
            throw error;
        }
    }

    async createRoom() {
        if (!this.peer) return;

        this.isHost = true;
        this.updateStatus('プレイヤー待機中...', 'connecting');

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
            this.updateStatus(`対戦相手: ${conn.metadata?.name || '不明'}`, 'connected');
            
            // ホストは黒（先攻）
            game.setOnlineMode(true, 1, conn.metadata?.name || '相手');
            game.setGameMode('online');
            
            // 相手に開始メッセージを送信
            this.connection.send({
                type: 'game_start',
                hostName: this.playerName,
                yourColor: 2
            });
        });

        return this.roomId;
    }

    async joinRoom(roomId) {
        if (!this.peer) return;

        this.isHost = false;
        this.updateStatus('接続中...', 'connecting');

        try {
            this.connection = this.peer.connect(roomId, {
                metadata: { name: this.playerName }
            });

            this.setupConnection();

            this.connection.on('open', () => {
                this.updateStatus('接続完了', 'connected');
            });

        } catch (error) {
            this.updateStatus('接続失敗', 'error');
            throw error;
        }
    }

    setupConnection() {
        if (!this.connection) return;

        this.connection.on('data', (data) => {
            switch (data.type) {
                case 'move':
                    game.receiveMove(data.row, data.col);
                    break;
                case 'game_start':
                    game.setOnlineMode(true, data.yourColor, data.hostName);
                    game.setGameMode('online');
                    this.updateStatus(`対戦相手: ${data.hostName}`, 'connected');
                    break;
                case 'reset':
                    game.initializeGame();
                    break;
            }
        });

        this.connection.on('close', () => {
            this.updateStatus('接続切断', 'error');
            game.setOnlineMode(false);
        });

        this.connection.on('error', (error) => {
            this.updateStatus('通信エラー', 'error');
            console.error('Connection error:', error);
        });
    }

    sendMove(row, col) {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'move',
                row: row,
                col: col
            });
        }
    }

    sendReset() {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'reset'
            });
        }
    }

    updateStatus(message, status = 'connected') {
        const statusElement = document.getElementById('status-text');
        const statusContainer = document.getElementById('connection-status');
        
        statusElement.textContent = message;
        statusContainer.className = `connection-status ${status}`;
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.updateStatus('オフライン', '');
        game.setOnlineMode(false);
    }
}

let game;
let onlineManager = new OnlineManager();

function resetGame() {
    game = new OthelloGame();
    game.setGameMode(getCurrentGameMode());
    game.setDifficulty(getCurrentDifficulty());
}

function setGameMode(mode) {
    const difficultySelector = document.getElementById('difficulty-selector');
    const onlineSetup = document.getElementById('online-setup');
    const twoPlayerBtn = document.getElementById('two-player-btn');
    const aiBtn = document.getElementById('ai-btn');
    const onlineBtn = document.getElementById('online-btn');
    
    // すべてのボタンを非アクティブにする
    twoPlayerBtn.classList.remove('active');
    aiBtn.classList.remove('active');
    onlineBtn.classList.remove('active');
    
    // すべてのセレクターを非表示にする
    difficultySelector.style.display = 'none';
    onlineSetup.style.display = 'none';
    
    if (mode === 'ai') {
        difficultySelector.style.display = 'flex';
        aiBtn.classList.add('active');
    } else if (mode === 'online') {
        onlineSetup.style.display = 'flex';
        onlineBtn.classList.add('active');
        // オンライン切断
        onlineManager.disconnect();
    } else {
        twoPlayerBtn.classList.add('active');
        // オンライン切断
        onlineManager.disconnect();
    }
    
    if (game) {
        game.setGameMode(mode);
        resetGame();
    }
}

function setDifficulty(difficulty) {
    if (game) {
        game.setDifficulty(difficulty);
    }
}

function getCurrentGameMode() {
    const aiBtn = document.getElementById('ai-btn');
    const onlineBtn = document.getElementById('online-btn');
    
    if (aiBtn.classList.contains('active')) return 'ai';
    if (onlineBtn.classList.contains('active')) return 'online';
    return 'two-player';
}

function getCurrentDifficulty() {
    const difficultySelect = document.getElementById('difficulty');
    return difficultySelect.value;
}

// オンライン対戦用の関数
async function createRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        alert('プレイヤー名を入力してください');
        return;
    }

    try {
        await onlineManager.initialize(playerName);
        const roomId = await onlineManager.createRoom();
        
        // ルームIDを表示
        document.getElementById('room-id').value = roomId;
        alert(`ルーム作成完了！\nルームID: ${roomId}\n相手プレイヤーの参加を待機中...`);
        
    } catch (error) {
        alert('ルーム作成に失敗しました: ' + error.message);
    }
}

async function joinRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    const roomId = document.getElementById('room-id').value.trim();
    
    if (!playerName) {
        alert('プレイヤー名を入力してください');
        return;
    }
    
    if (!roomId) {
        alert('ルームIDを入力してください');
        return;
    }

    try {
        await onlineManager.initialize(playerName);
        await onlineManager.joinRoom(roomId);
        
    } catch (error) {
        alert('ルーム参加に失敗しました: ' + error.message);
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    game = new OthelloGame();
    setGameMode('two-player'); // デフォルトは2人プレイ
});