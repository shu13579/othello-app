/**
 * Game Controller for Othello
 * ゲーム全体の制御とモジュール間の連携
 */
import { OthelloGameEngine, OthelloAI } from './gameEngine.js';
import { NetworkManager } from './networkManager.js';
import { UIManager } from './uiManager.js';

export class GameController {
    constructor() {
        this.gameEngine = new OthelloGameEngine();
        this.networkManager = new NetworkManager();
        this.uiManager = new UIManager();
        this.aiDifficulty = 'normal';
        
        // タイマー関連
        this.turnTimer = null;
        this.turnTimeLimit = 30; // 30秒
        this.currentTimeLeft = this.turnTimeLimit;
        
        this.initializeComponents();
        this.startNewGame();
    }

    initializeComponents() {
        // UIManagerにゲームエンジンとネットワークマネージャーを設定
        this.uiManager.setGameEngine(this.gameEngine);
        this.uiManager.setNetworkManager(this.networkManager);

        // UIManagerのコールバック設定
        this.uiManager.setMoveCallback((row, col) => {
            this.handlePlayerMove(row, col);
        });

        this.uiManager.setGameModeChangeCallback((mode) => {
            this.changeGameMode(mode);
        });

        this.uiManager.setResetCallback(() => {
            this.resetGame();
        });

        // ネットワークマネージャーのコールバック設定
        this.networkManager.setStatusCallback((message, status) => {
            this.uiManager.updateStatus(message, status);
        });

        this.networkManager.setMessageCallback((data) => {
            this.handleNetworkMessage(data);
        });

        this.networkManager.setConnectionCallback((isHost, opponentName) => {
            this.handlePlayerConnection(isHost, opponentName);
        });
    }

    startNewGame() {
        this.gameEngine.initializeBoard();
        this.uiManager.updateBoard();
        this.uiManager.updateStatus('ゲーム開始', 'ready');
        this.stopTimer();
    }

    async handlePlayerMove(row, col) {
        const gameState = this.gameEngine.getGameState();

        // ゲームが終了している場合は何もしない
        if (gameState.gameOver) return;

        // 有効な手かチェック
        if (!this.gameEngine.isValidMove(row, col, gameState.currentPlayer)) {
            return;
        }

        // オンラインモードで自分のターンでない場合は何もしない
        if (gameState.isOnline && gameState.currentPlayer !== gameState.onlinePlayerColor) {
            console.log('自分のターンではありません。現在のプレイヤー:', gameState.currentPlayer, '自分の色:', gameState.onlinePlayerColor);
            return;
        }

        // 手を実行
        const result = this.gameEngine.makeMove(row, col);
        if (!result || !result.success) return;

        // UIを更新
        this.uiManager.updateBoard();
        this.uiManager.highlightLastMove(row, col);
        this.uiManager.updateCurrentPlayer();
        
        // タイマーを停止
        this.stopTimer();

        // オンラインモードの場合、相手に手を送信
        if (gameState.isOnline && this.networkManager) {
            try {
                console.log('相手に手を送信:', row, col, 'currentPlayer:', this.gameEngine.currentPlayer);
                const sendResult = await this.networkManager.sendMove(row, col);
                console.log('送信結果:', sendResult);
            } catch (error) {
                console.error('手の送信に失敗しました:', error);
                this.uiManager.updateStatus('送信エラー', 'error');
            }
        }

        // ゲーム終了チェック
        if (result.gameOver) {
            this.handleGameOver(result.winner);
            return;
        }

        // 次の手があるかチェック（パス処理）
        const currentGameState = this.gameEngine.getGameState();
        if (!this.gameEngine.hasValidMoves(currentGameState.currentPlayer)) {
            console.log('現在のプレイヤーに有効な手がありません、パス');
            // パスの場合、再度ターンを切り替え
            this.gameEngine.currentPlayer = this.gameEngine.currentPlayer === 1 ? 2 : 1;
            this.uiManager.updateCurrentPlayer();
            
            // 次のプレイヤーにも有効な手がない場合、ゲーム終了
            if (!this.gameEngine.hasValidMoves(this.gameEngine.currentPlayer)) {
                this.gameEngine.gameOver = true;
                this.handleGameOver(this.gameEngine.getWinner());
                return;
            }
        }

        // AIモードでAIのターン
        if (gameState.gameMode === 'ai' && this.gameEngine.currentPlayer === 2) {
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    }

    async makeAIMove() {
        const move = OthelloAI.makeMove(this.gameEngine, this.aiDifficulty);
        if (!move) return;

        const result = this.gameEngine.makeMove(move.row, move.col);
        if (result && result.success) {
            this.uiManager.updateBoard();
            this.uiManager.highlightLastMove(move.row, move.col);

            if (result.gameOver) {
                this.handleGameOver(result.winner);
            }
        }
    }

    handleNetworkMessage(data) {
        switch (data.type) {
            case 'move':
                this.handleOpponentMove(data.row, data.col);
                break;
            case 'game_start':
                this.handleGameStart(data);
                break;
            case 'reset':
                this.resetGame();
                break;
            default:
                console.log('未知のメッセージタイプ:', data.type);
        }
    }

    handleOpponentMove(row, col) {
        console.log('相手の手を受信:', row, col);
        const gameState = this.gameEngine.getGameState();
        console.log('受信前のゲーム状態:', {
            currentPlayer: gameState.currentPlayer,
            onlinePlayerColor: gameState.onlinePlayerColor,
            isOnline: gameState.isOnline
        });
        
        const result = this.gameEngine.makeMove(row, col, true); // バリデーションをスキップ
        console.log('手の実行結果:', result);
        
        if (result && result.success) {
            this.uiManager.updateBoard();
            this.uiManager.highlightLastMove(row, col);

            const newGameState = this.gameEngine.getGameState();
            console.log('受信後のゲーム状態:', {
                currentPlayer: newGameState.currentPlayer,
                onlinePlayerColor: newGameState.onlinePlayerColor,
                isOnline: newGameState.isOnline
            });

            // ターン表示を強制更新
            this.uiManager.updateCurrentPlayer();

            // オンラインモードで自分のターンの場合、タイマーを開始
            if (newGameState.isOnline && newGameState.currentPlayer === newGameState.onlinePlayerColor) {
                this.startTimer();
            }

            // 次の手があるかチェック
            if (!this.gameEngine.hasValidMoves(newGameState.currentPlayer)) {
                console.log('現在のプレイヤーに有効な手がありません、パス');
                // パスの場合、再度ターンを切り替え
                this.gameEngine.currentPlayer = this.gameEngine.currentPlayer === 1 ? 2 : 1;
                this.uiManager.updateCurrentPlayer();
                
                // 次のプレイヤーにも有効な手がない場合、ゲーム終了
                if (!this.gameEngine.hasValidMoves(this.gameEngine.currentPlayer)) {
                    this.gameEngine.gameOver = true;
                    this.handleGameOver(this.gameEngine.getWinner());
                    return;
                }
            }

            if (result.gameOver) {
                this.handleGameOver(result.winner);
            }
        } else {
            console.error('相手の手の実行に失敗しました:', { row, col, result });
            this.uiManager.updateStatus('ゲーム同期エラー', 'error');
        }
    }

    handleGameStart(data) {
        this.gameEngine.setOnlineMode(true, data.yourColor, data.hostName);
        this.gameEngine.setGameMode('online');
        this.startNewGame();
        this.uiManager.updateStatus('オンライン対戦開始', 'connected');
    }

    handlePlayerConnection(isHost, opponentName) {
        if (isHost) {
            this.gameEngine.setOnlineMode(true, 1, opponentName);
            this.gameEngine.setGameMode('online');
            this.startNewGame();
            this.uiManager.updateStatus('対戦相手が接続しました', 'connected');
            
            // ホストが先手なのでタイマーを開始
            this.startTimer();
        }
    }

    changeGameMode(mode) {
        // 現在の接続を切断
        if (this.networkManager) {
            this.networkManager.disconnect();
        }

        // タイマーを停止
        this.stopTimer();

        // ゲームモード設定
        this.gameEngine.setGameMode(mode);
        this.gameEngine.setOnlineMode(false, 1, '');

        // UIを更新
        this.uiManager.updateGameModeUI(mode);
        this.startNewGame();

        // モード別の設定
        switch (mode) {
            case 'local':
                this.uiManager.updateStatus('ローカル対戦モード', 'ready');
                break;
            case 'ai':
                this.uiManager.updateStatus('AI対戦モード', 'ready');
                break;
            case 'online':
                this.uiManager.updateStatus('オンライン対戦モード - ルームを作成または参加してください', 'ready');
                break;
        }
    }

    async resetGame() {
        this.startNewGame();

        // オンラインモードの場合、相手にリセット通知を送信
        const gameState = this.gameEngine.getGameState();
        if (gameState.isOnline && this.networkManager) {
            try {
                await this.networkManager.sendReset();
            } catch (error) {
                console.error('リセット通知の送信に失敗しました:', error);
            }
        }
    }

    handleGameOver(winner) {
        this.uiManager.showGameOverDialog(winner);
    }

    setAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
    }

    getGameState() {
        return {
            game: this.gameEngine.getGameState(),
            network: this.networkManager.getConnectionInfo()
        };
    }

    // タイマー制御メソッド
    startTimer() {
        const gameState = this.gameEngine.getGameState();
        
        // オンラインモードでない場合は何もしない
        if (!gameState.isOnline) return;
        
        // 既存のタイマーを停止
        this.stopTimer();
        
        // タイマーを表示
        this.uiManager.showTimer();
        
        // 時間をリセット
        this.currentTimeLeft = this.turnTimeLimit;
        this.uiManager.updateTimer(this.currentTimeLeft);
        
        // 1秒ごとにカウントダウン
        this.turnTimer = setInterval(() => {
            this.currentTimeLeft--;
            this.uiManager.updateTimer(this.currentTimeLeft);
            
            if (this.currentTimeLeft <= 0) {
                this.handleTimeOut();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        this.uiManager.hideTimer();
    }
    
    async handleTimeOut() {
        console.log('タイムアウト発生');
        this.stopTimer();
        
        const gameState = this.gameEngine.getGameState();
        
        // 自分のターンの場合のみタイムアウト処理
        if (gameState.isOnline && gameState.currentPlayer === gameState.onlinePlayerColor) {
            const validMoves = this.gameEngine.getValidMoves(gameState.currentPlayer);
            
            if (validMoves.length > 0) {
                // ランダムな有効手を選択
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                console.log('タイムアウトによる自動手:', randomMove);
                
                this.uiManager.updateStatus('時間切れ - 自動で手を選択しました', 'warning');
                
                // 少し遅延を入れてから手を実行
                setTimeout(() => {
                    this.handlePlayerMove(randomMove.row, randomMove.col);
                }, 500);
            }
        }
    }

    // デバッグ用メソッド
    debugInfo() {
        console.log('=== Game Debug Info ===');
        console.log('Game State:', this.gameEngine.getGameState());
        console.log('Network Info:', this.networkManager.getConnectionInfo());
        console.log('======================');
    }
}