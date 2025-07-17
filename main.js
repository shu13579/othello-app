/**
 * Main entry point for Othello Game
 * ゲームのエントリーポイント
 */
import { GameController } from './js/gameController.js';

// DOMが読み込まれたらゲームを開始
document.addEventListener('DOMContentLoaded', () => {
    // ゲームコントローラーを初期化
    const gameController = new GameController();
    
    // デバッグ用にグローバルに公開
    window.gameController = gameController;
    
    console.log('Othello Game initialized successfully!');
});