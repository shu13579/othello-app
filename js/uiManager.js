/**
 * UI Manager for Othello Game
 * ユーザーインターフェースの管理
 */
export class UIManager {
    constructor() {
        this.gameEngine = null;
        this.networkManager = null;
        this.onMoveCallback = null;
        this.onGameModeChangeCallback = null;
        this.onResetCallback = null;
        this.currentValidMoves = [];
        
        this.initializeEventListeners();
    }

    setGameEngine(gameEngine) {
        this.gameEngine = gameEngine;
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
    }

    setMoveCallback(callback) {
        this.onMoveCallback = callback;
    }

    setGameModeChangeCallback(callback) {
        this.onGameModeChangeCallback = callback;
    }

    setResetCallback(callback) {
        this.onResetCallback = callback;
    }

    initializeEventListeners() {
        // ゲームボード
        document.getElementById('gameBoard').addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.handleCellClick(row, col);
            }
        });

        // ゲームモード切り替え
        document.getElementById('localBtn').addEventListener('click', () => {
            this.changeGameMode('local');
        });

        document.getElementById('aiBtn').addEventListener('click', () => {
            this.changeGameMode('ai');
        });

        document.getElementById('onlineBtn').addEventListener('click', () => {
            this.changeGameMode('online');
        });

        // リセットボタン
        document.getElementById('resetBtn').addEventListener('click', () => {
            if (this.onResetCallback) {
                this.onResetCallback();
            }
        });

        // オンライン機能
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.handleCreateRoom();
        });

        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.handleJoinRoom();
        });
    }

    handleCellClick(row, col) {
        if (this.onMoveCallback) {
            this.onMoveCallback(row, col);
        }
    }

    changeGameMode(mode) {
        if (this.onGameModeChangeCallback) {
            this.onGameModeChangeCallback(mode);
        }
        this.updateGameModeUI(mode);
    }

    updateGameModeUI(mode) {
        // ボタンの状態を更新
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        switch (mode) {
            case 'local':
                document.getElementById('localBtn').classList.add('active');
                break;
            case 'ai':
                document.getElementById('aiBtn').classList.add('active');
                break;
            case 'online':
                document.getElementById('onlineBtn').classList.add('active');
                break;
        }

        // オンライン機能の表示/非表示
        const onlineControls = document.getElementById('onlineControls');
        if (mode === 'online') {
            onlineControls.style.display = 'block';
        } else {
            onlineControls.style.display = 'none';
        }
    }

    updateBoard() {
        if (!this.gameEngine) return;

        const gameState = this.gameEngine.getGameState();
        const board = document.getElementById('gameBoard');
        
        // ボードをクリア
        board.innerHTML = '';

        // セルを作成
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (gameState.board[row][col] === 1) {
                    cell.classList.add('black');
                } else if (gameState.board[row][col] === 2) {
                    cell.classList.add('white');
                }

                board.appendChild(cell);
            }
        }

        this.updateValidMoves();
        this.updateScores();
        this.updateCurrentPlayer();
    }

    updateValidMoves() {
        if (!this.gameEngine) return;

        const gameState = this.gameEngine.getGameState();
        
        // 前回の有効手をクリア
        document.querySelectorAll('.cell.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });

        // オンラインモードで自分のターンでない場合は表示しない
        if (gameState.isOnline && gameState.currentPlayer !== gameState.onlinePlayerColor) {
            return;
        }

        // 現在の有効手を表示
        this.currentValidMoves = this.gameEngine.getValidMoves(gameState.currentPlayer);
        this.currentValidMoves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (cell) {
                cell.classList.add('valid-move');
            }
        });
    }

    updateScores() {
        if (!this.gameEngine) return;

        const gameState = this.gameEngine.getGameState();
        document.getElementById('blackScore').textContent = gameState.scores.black;
        document.getElementById('whiteScore').textContent = gameState.scores.white;
    }

    updateCurrentPlayer() {
        if (!this.gameEngine) return;

        const gameState = this.gameEngine.getGameState();
        const currentPlayerElement = document.getElementById('currentPlayer');
        
        if (gameState.gameOver) {
            const winner = this.gameEngine.getWinner();
            if (winner === 'tie') {
                currentPlayerElement.textContent = '引き分け！';
            } else {
                const winnerText = winner === 'black' ? '黒' : '白';
                currentPlayerElement.textContent = `${winnerText}の勝利！`;
            }
            currentPlayerElement.className = 'game-over';
        } else {
            const playerText = gameState.currentPlayer === 1 ? '黒' : '白';
            
            if (gameState.isOnline) {
                if (gameState.currentPlayer === gameState.onlinePlayerColor) {
                    currentPlayerElement.textContent = `あなたのターン (${playerText})`;
                } else {
                    const opponentName = gameState.opponentName || '相手';
                    currentPlayerElement.textContent = `${opponentName}のターン (${playerText})`;
                }
            } else {
                currentPlayerElement.textContent = `${playerText}のターン`;
            }
            
            currentPlayerElement.className = gameState.currentPlayer === 1 ? 'black' : 'white';
        }
    }

    updateStatus(message, status) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${status}`;
    }

    async handleCreateRoom() {
        if (!this.networkManager) return;

        const playerName = prompt('プレイヤー名を入力してください:', 'プレイヤー1');
        if (!playerName) return;

        try {
            await this.networkManager.initialize(playerName);
            const roomId = await this.networkManager.createRoom();
            
            document.getElementById('roomDisplay').textContent = `ルームID: ${roomId}`;
            this.updateStatus(`ルーム作成完了 (ID: ${roomId}) - プレイヤー待機中...`, 'connecting');
            
        } catch (error) {
            console.error('ルーム作成エラー:', error);
            this.updateStatus('ルーム作成に失敗しました', 'error');
        }
    }

    async handleJoinRoom() {
        if (!this.networkManager) return;

        const roomId = prompt('ルームIDを入力してください:');
        if (!roomId || !/^\d{5}$/.test(roomId)) {
            alert('5桁の数字でルームIDを入力してください');
            return;
        }

        const playerName = prompt('プレイヤー名を入力してください:', 'プレイヤー2');
        if (!playerName) return;

        try {
            await this.networkManager.initialize(playerName);
            const success = await this.networkManager.joinRoom(roomId);
            
            if (success) {
                document.getElementById('roomDisplay').textContent = `ルームID: ${roomId}`;
                this.updateStatus('ルーム参加完了', 'connected');
            } else {
                this.updateStatus('ルーム参加に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('ルーム参加エラー:', error);
            this.updateStatus('ルーム参加に失敗しました', 'error');
        }
    }

    showGameOverDialog(winner) {
        const winnerText = winner === 'tie' ? '引き分け' : 
                          winner === 'black' ? '黒の勝利' : '白の勝利';
        
        setTimeout(() => {
            if (confirm(`ゲーム終了: ${winnerText}\n\n新しいゲームを開始しますか？`)) {
                if (this.onResetCallback) {
                    this.onResetCallback();
                }
            }
        }, 500);
    }

    enableBoard() {
        document.getElementById('gameBoard').style.pointerEvents = 'auto';
    }

    disableBoard() {
        document.getElementById('gameBoard').style.pointerEvents = 'none';
    }

    highlightLastMove(row, col) {
        // 前回のハイライトをクリア
        document.querySelectorAll('.cell.last-move').forEach(cell => {
            cell.classList.remove('last-move');
        });

        // 新しいハイライトを追加
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('last-move');
        }
    }
}