import io from 'socket.io-client';
import { Message } from '../models/Message';

export class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentUrl = '';
        this.connectionStatus = 'Поиск сервера...';
        this.messageCallbacks = [];
        this.connectionCallbacks = [];
        this.historyCallbacks = [];
        this.clearCallbacks = [];
    }

    initialize(serverUrls) {
        this.serverUrls = serverUrls;
        this.connectToServer(0);
    }

    connectToServer(urlIndex = 0) {
        if (urlIndex >= this.serverUrls.length) {
            this.setConnectionStatus('Сервер не найден');
            this.executeCallbacks(this.connectionCallbacks, false, 'Сервер не найден');
            return;
        }

        const url = this.serverUrls[urlIndex];
        this.currentUrl = url;
        this.setConnectionStatus(`Подключение к ${url}...`);

        this.socket = io(url, {
            transports: ['polling', 'websocket'],
            timeout: 8000,
            forceNew: true,
            reconnection: false
        });

        this.setupEventListeners(urlIndex);

        setTimeout(() => {
            if (!this.socket.connected) {
                this.socket.disconnect();
            }
        }, 8000);
    }

    setupEventListeners(urlIndex) {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.socketId = this.socket.id; // Сохраняем socketId
            this.setConnectionStatus('Подключено ✓');

            console.log('=== SOCKET CONNECTED ===');
            console.log('Socket ID:', this.socketId);

            this.executeCallbacks(this.connectionCallbacks, true, 'Подключено');
        });
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.setConnectionStatus('Отключено: ' + reason);
            this.executeCallbacks(this.connectionCallbacks, false, reason);
        });

        this.socket.on('connect_error', (error) => {
            this.isConnected = false;
            this.setConnectionStatus(`Ошибка: ${error.message}`);
            setTimeout(() => this.connectToServer(urlIndex + 1), 1000);
        });

        this.socket.on('message_history', (data) => {
            const messages = (data.messages || []).map(msg => Message.fromJSON(msg));
            this.executeCallbacks(this.historyCallbacks, messages);
        });

        this.socket.on('chat_message', (data) => {
            console.log('=== RAW MESSAGE FROM SERVER ===');
            console.log('Data:', data);

            const message = Message.fromJSON(data.message);
            this.executeCallbacks(this.messageCallbacks, message);
        });

        this.socket.on('chat_cleared', () => {
            this.executeCallbacks(this.clearCallbacks);
        });
    }

    setConnectionStatus(status) {
        this.connectionStatus = status;
    }

    executeCallbacks(callbacks, ...args) {
        callbacks.forEach(callback => callback(...args));
    }

    // Подписки на события
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }

    onHistoryReceived(callback) {
        this.historyCallbacks.push(callback);
    }

    onChatCleared(callback) {
        this.clearCallbacks.push(callback);
    }

    // Отправка событий
    sendMessage(text) {
        if (this.isConnected && this.socket) {
            this.socket.emit('chat_message', { text: text.trim() });
            return true;
        }
        return false;
    }

    clearChat() {
        if (this.isConnected && this.socket) {
            this.socket.emit('clear_chat');
            return true;
        }
        return false;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    retryConnection() {
        this.disconnect();
        this.isConnected = false;
        this.setConnectionStatus('Переподключение...');
        setTimeout(() => this.connectToServer(0), 500);
    }

    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus,
            currentUrl: this.currentUrl,
            socketId: this.socketId // Возвращаем сохраненный socketId
        };
    }
}