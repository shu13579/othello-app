/**
 * Network Manager for Othello Online Multiplayer
 * オンライン対戦のための接続管理
 */
export class NetworkManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.playerName = '';
        this.roomId = '';
        this.peerId = '';
        this.status = 'disconnected';
        this.statusCallback = null;
        this.messageCallback = null;
        this.connectionCallback = null;
    }

    setStatusCallback(callback) {
        this.statusCallback = callback;
    }

    setMessageCallback(callback) {
        this.messageCallback = callback;
    }

    setConnectionCallback(callback) {
        this.connectionCallback = callback;
    }

    updateStatus(message, status) {
        this.status = status;
        if (this.statusCallback) {
            this.statusCallback(message, status);
        }
    }

    generateRoomId() {
        return Math.floor(10000 + Math.random() * 90000).toString();
    }

    generateCustomPeerId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `othello-${timestamp}-${random}`;
    }

    async initialize(playerName) {
        this.playerName = playerName;
        this.updateStatus('PeerJSサーバーに接続中...', 'connecting');

        const serverConfigs = [
            { host: 'broker-relay-production.herokuapp.com', port: 443, secure: true },
            { host: '0.peerjs.com', port: 443, secure: true },
            { host: 'peerjs-server.herokuapp.com', port: 443, secure: true }
        ];

        for (let i = 0; i < serverConfigs.length; i++) {
            try {
                this.updateStatus(`接続中... (${i + 1}/${serverConfigs.length})`, 'connecting');
                
                const customId = this.generateCustomPeerId();
                this.peer = new Peer(customId, serverConfigs[i]);

                const id = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('接続タイムアウト'));
                    }, 10000);

                    this.peer.on('open', (id) => {
                        clearTimeout(timeout);
                        this.peerId = id;
                        this.updateStatus('オンライン', 'connected');
                        resolve(id);
                    });

                    this.peer.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                return id;

            } catch (error) {
                console.error(`サーバー ${i + 1} 接続失敗:`, error);
                if (this.peer) {
                    this.peer.destroy();
                    this.peer = null;
                }
                if (i === serverConfigs.length - 1) {
                    this.updateStatus('すべてのサーバーへの接続に失敗しました', 'error');
                    throw new Error('すべてのPeerJSサーバーへの接続に失敗しました');
                }
            }
        }
    }

    async createRoom() {
        if (!this.peer) return null;

        this.isHost = true;
        this.roomId = this.generateRoomId();
        
        // ルームIDに基づいた確定的なPeerIDで再接続
        const roomBasedPeerId = this.generatePeerIdFromRoomId(this.roomId);
        
        // 現在のPeerを破棄して新しいPeerIDで再接続
        this.peer.destroy();
        
        const serverConfigs = [
            { host: 'broker-relay-production.herokuapp.com', port: 443, secure: true },
            { host: '0.peerjs.com', port: 443, secure: true },
            { host: 'peerjs-server.herokuapp.com', port: 443, secure: true }
        ];

        for (let i = 0; i < serverConfigs.length; i++) {
            try {
                this.peer = new Peer(roomBasedPeerId, serverConfigs[i]);

                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('接続タイムアウト'));
                    }, 10000);

                    this.peer.on('open', (id) => {
                        clearTimeout(timeout);
                        this.peerId = id;
                        resolve(id);
                    });

                    this.peer.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                break; // 成功したらループを抜ける

            } catch (error) {
                console.error(`サーバー ${i + 1} 接続失敗:`, error);
                if (this.peer) {
                    this.peer.destroy();
                    this.peer = null;
                }
                if (i === serverConfigs.length - 1) {
                    throw new Error('すべてのPeerJSサーバーへの接続に失敗しました');
                }
            }
        }
        
        this.updateStatus('プレイヤー待機中...', 'connecting');

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
            
            if (this.connectionCallback) {
                this.connectionCallback(true, conn.metadata?.name || '相手');
            }
            
            if (this.connection.open) {
                this.sendGameStartMessage();
            } else {
                this.connection.on('open', () => {
                    this.sendGameStartMessage();
                });
            }
        });

        return this.roomId;
    }

    async sendGameStartMessage() {
        if (!this.connection) {
            console.warn('接続が存在しません。ゲーム開始メッセージを送信できません。');
            return false;
        }

        if (!this.connection.open) {
            console.warn('接続が開いていません。接続が開くまで待機します...');
            this.updateStatus('接続待機中...', 'connecting');
            
            try {
                await this.waitForConnectionOpen();
            } catch (error) {
                console.error('接続待機タイムアウト:', error);
                this.updateStatus('接続タイムアウト', 'error');
                return false;
            }
        }

        try {
            this.connection.send({
                type: 'game_start',
                hostName: this.playerName,
                yourColor: 2,
                roomId: this.roomId
            });
            return true;
        } catch (error) {
            console.error('ゲーム開始メッセージ送信エラー:', error);
            this.updateStatus('送信エラー', 'error');
            return false;
        }
    }

    async joinRoom(roomId) {
        if (!this.peer) return false;

        this.isHost = false;
        this.roomId = roomId;
        this.updateStatus('ルームに接続中...', 'connecting');

        try {
            // 改善されたルーム接続方式
            // ルームIDをベースにした確定的なPeerID生成を使用
            const targetPeerId = this.generatePeerIdFromRoomId(roomId);
            
            this.connection = this.peer.connect(targetPeerId, {
                metadata: { name: this.playerName, roomId: roomId }
            });

            this.setupConnection();

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('接続タイムアウト'));
                }, 15000);

                this.connection.on('open', () => {
                    clearTimeout(timeout);
                    this.updateStatus('接続完了', 'connected');
                    resolve();
                });

                this.connection.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            return true;

        } catch (error) {
            this.updateStatus('ルーム接続失敗', 'error');
            console.error('ルーム接続エラー:', error);
            return false;
        }
    }

    generatePeerIdFromRoomId(roomId) {
        // ルームIDから確定的にPeerIDを生成
        // 実際のプロダクションでは、専用のシグナリングサーバーを使用すべき
        const baseId = 'othello-room';
        const hash = this.simpleHash(roomId);
        return `${baseId}-${roomId}-${hash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    setupConnection() {
        if (!this.connection) return;

        this.connection.on('data', (data) => {
            if (this.messageCallback) {
                this.messageCallback(data);
            }
        });

        this.connection.on('close', () => {
            this.updateStatus('接続が切断されました', 'disconnected');
            this.connection = null;
        });

        this.connection.on('error', (error) => {
            console.error('接続エラー:', error);
            this.updateStatus('接続エラー', 'error');
        });
    }

    async sendMove(row, col) {
        return this.sendMessage({
            type: 'move',
            row: row,
            col: col
        });
    }

    async sendReset() {
        return this.sendMessage({
            type: 'reset'
        });
    }

    async sendMessage(message) {
        if (!this.connection) {
            console.warn('接続が存在しません。メッセージを送信できません。');
            this.updateStatus('接続が存在しません', 'error');
            return false;
        }

        if (!this.connection.open) {
            console.warn('接続が開いていません。接続が開くまで待機します...');
            this.updateStatus('接続待機中...', 'connecting');
            
            try {
                await this.waitForConnectionOpen();
            } catch (error) {
                console.error('接続待機タイムアウト:', error);
                this.updateStatus('接続タイムアウト', 'error');
                return false;
            }
        }

        try {
            this.connection.send(message);
            return true;
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            this.updateStatus('送信エラー', 'error');
            return false;
        }
    }

    waitForConnectionOpen(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (this.connection.open) {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('接続待機タイムアウト'));
            }, timeout);

            const onOpen = () => {
                clearTimeout(timeoutId);
                this.connection.off('open', onOpen);
                resolve();
            };

            this.connection.on('open', onOpen);
        });
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.updateStatus('切断済み', 'disconnected');
    }

    getConnectionInfo() {
        return {
            isHost: this.isHost,
            roomId: this.roomId,
            peerId: this.peerId,
            playerName: this.playerName,
            status: this.status,
            connected: this.connection && this.connection.open
        };
    }
}