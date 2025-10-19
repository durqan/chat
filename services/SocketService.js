import io from 'socket.io-client';
import { Message } from '../models/Message';

export class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentUrl = '';
        this.connectionStatus = 'Поиск сервера...';
        this.socketId = null;

        // Callbacks для сообщений
        this.messageCallbacks = [];
        this.connectionCallbacks = [];
        this.historyCallbacks = [];
        this.clearCallbacks = [];

        // Callbacks для комнат
        this.roomListCallbacks = [];
        this.roomUsersCallbacks = [];
        this.userJoinedCallbacks = [];
        this.userLeftCallbacks = [];
        this.roomCreatedCallbacks = [];
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
        this.setConnectionStatus(`Подключение к ${this.getDisplayUrl(url)}...`);

        console.log(`Attempting to connect to: ${url}`);

        // Закрываем предыдущее соединение, если оно есть
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(url, {
            transports: ['polling', 'websocket'],
            timeout: 8000,
            forceNew: true,
            reconnection: false
        });

        this.setupEventListeners(urlIndex);

        // Таймаут для проверки подключения
        setTimeout(() => {
            if (this.socket && !this.socket.connected) {
                console.log(`Connection timeout for: ${url}`);
                this.socket.disconnect();
                this.handleConnectionError(urlIndex + 1);
            }
        }, 8000);
    }

    setupEventListeners(urlIndex) {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.socketId = this.socket.id;
            this.setConnectionStatus('Подключено ✓');

            console.log('=== SOCKET CONNECTED ===');
            console.log('Socket ID:', this.socketId);
            console.log('Connected to:', this.currentUrl);

            this.executeCallbacks(this.connectionCallbacks, true, 'Подключено');
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.setConnectionStatus('Отключено: ' + reason);
            console.log('Socket disconnected:', reason);
            this.executeCallbacks(this.connectionCallbacks, false, reason);
        });

        this.socket.on('connect_error', (error) => {
            this.isConnected = false;
            this.setConnectionStatus(`Ошибка: ${error.message}`);
            console.log('Connection error:', error.message);

            // Пытаемся подключиться к следующему URL
            this.handleConnectionError(urlIndex + 1);
        });

        // Обработчики сообщений
        this.socket.on('message_history', (data) => {
            console.log('Received message history:', data);

            // Гарантируем, что messages всегда массив
            const messages = (data?.messages || []);
            const safeMessages = Array.isArray(messages) ? messages : [];

            const parsedMessages = safeMessages.map(msg => Message.fromJSON(msg));

            this.executeCallbacks(this.historyCallbacks, {
                ...data,
                messages: parsedMessages
            });
        });

        this.socket.on('chat_message', (data) => {
            console.log('📨 Immediate message received on client');

            if (!data || !data.message) {
                console.error('Invalid chat message data:', data);
                return;
            }

            try {
                const message = Message.fromJSON(data.message);
                // Немедленный вызов callback'ов
                this.executeCallbacks(this.messageCallbacks, message);
            } catch (error) {
                console.error('Error processing chat message:', error);
            }
        });

        this.socket.on('chat_cleared', () => {
            console.log('Chat cleared event received');
            this.executeCallbacks(this.clearCallbacks);
        });

        // Обработчики комнат
        this.socket.on('room_list', (data) => {
            console.log('Received room list:', data);
            this.executeCallbacks(this.roomListCallbacks, data);
        });

        this.socket.on('room_users', (data) => {
            console.log('Received room users:', data);
            this.executeCallbacks(this.roomUsersCallbacks, data);
        });

        this.socket.on('user_joined', (data) => {
            console.log('User joined room:', data);
            this.executeCallbacks(this.userJoinedCallbacks, data);
        });

        this.socket.on('user_left', (data) => {
            console.log('User left room:', data);
            this.executeCallbacks(this.userLeftCallbacks, data);
        });

        this.socket.on('room_created', (data) => {
            console.log('Room created:', data);
            this.executeCallbacks(this.roomCreatedCallbacks, data);
        });

        this.socket.on('error', (error) => {
            console.log('Socket error:', error);
            this.setConnectionStatus(`Ошибка: ${error.message}`);
        });
    }

    handleConnectionError(nextUrlIndex) {
        if (nextUrlIndex < this.serverUrls.length) {
            // Пробуем следующий URL
            setTimeout(() => {
                this.connectToServer(nextUrlIndex);
            }, 1000);
        } else {
            // Все URL перепробованы
            this.executeCallbacks(this.connectionCallbacks, false, 'Все серверы недоступны');
        }
    }

    setConnectionStatus(status) {
        this.connectionStatus = status;
        console.log('Connection status:', status);
    }

    executeCallbacks(callbacks, ...args) {
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error('Error in socket callback:', error);
            }
        });
    }

    // ========== ПОДПИСКИ НА СОБЫТИЯ ==========

    // Основные события
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

    // События комнат
    onRoomList(callback) {
        this.roomListCallbacks.push(callback);
    }

    onRoomUsers(callback) {
        this.roomUsersCallbacks.push(callback);
    }

    onUserJoined(callback) {
        this.userJoinedCallbacks.push(callback);
    }

    onUserLeft(callback) {
        this.userLeftCallbacks.push(callback);
    }

    onRoomCreated(callback) {
        this.roomCreatedCallbacks.push(callback);
    }

    // ========== ОТПРАВКА СОБЫТИЙ ==========

    // Работа с сообщениями
    sendMessage(text) {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot send message: not connected');
            return false;
        }

        if (!text || text.trim() === '') {
            console.warn('Cannot send empty message');
            return false;
        }

        try {
            const messageData = { text: text.trim() };
            console.log('Sending message:', messageData);
            this.socket.emit('chat_message', messageData);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    clearChat() {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot clear chat: not connected');
            return false;
        }

        try {
            console.log('Clearing chat');
            this.socket.emit('clear_chat');
            return true;
        } catch (error) {
            console.error('Error clearing chat:', error);
            return false;
        }
    }

    // Работа с комнатами
    joinRoom(roomId) {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot join room: not connected');
            return false;
        }

        try {
            console.log('Joining room:', roomId);
            this.socket.emit('join_room', { roomId });
            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            return false;
        }
    }

    leaveRoom(roomId) {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot leave room: not connected');
            return false;
        }

        try {
            console.log('Leaving room:', roomId);
            this.socket.emit('leave_room', { roomId });
            return true;
        } catch (error) {
            console.error('Error leaving room:', error);
            return false;
        }
    }

    createRoom(roomId, roomName) {
        if (!this.isConnected || !this.socket) {
            console.warn('Cannot create room: not connected');
            return false;
        }

        try {
            console.log('Creating room:', roomId, roomName);
            this.socket.emit('create_room', { roomId, roomName });
            return true;
        } catch (error) {
            console.error('Error creating room:', error);
            return false;
        }
    }

    // ========== УПРАВЛЕНИЕ СОЕДИНЕНИЕМ ==========

    disconnect() {
        if (this.socket) {
            console.log('Disconnecting socket');
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.socketId = null;
        this.setConnectionStatus('Отключено');
    }

    retryConnection() {
        console.log('Retrying connection...');
        this.disconnect();
        this.isConnected = false;
        this.setConnectionStatus('Переподключение...');
        setTimeout(() => {
            this.connectToServer(0);
        }, 500);
    }

    // ========== ИНФОРМАЦИЯ О СОЕДИНЕНИИ ==========

    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus,
            currentUrl: this.currentUrl,
            socketId: this.socketId
        };
    }

    getDisplayUrl(url) {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    }

    // ========== ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ ==========

    isConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }

    getSocketId() {
        return this.socketId;
    }

    getCurrentUrl() {
        return this.currentUrl;
    }

    // Очистка всех callback'ов
    removeAllListeners() {
        this.messageCallbacks = [];
        this.connectionCallbacks = [];
        this.historyCallbacks = [];
        this.clearCallbacks = [];
        this.roomListCallbacks = [];
        this.roomUsersCallbacks = [];
        this.userJoinedCallbacks = [];
        this.userLeftCallbacks = [];
        this.roomCreatedCallbacks = [];
    }

    // Подписка на одноразовые события
    onceConnected(callback) {
        const wrappedCallback = (isConnected, status) => {
            if (isConnected) {
                callback(isConnected, status);
                // Удаляем callback после выполнения
                const index = this.connectionCallbacks.indexOf(wrappedCallback);
                if (index > -1) {
                    this.connectionCallbacks.splice(index, 1);
                }
            }
        };
        this.connectionCallbacks.push(wrappedCallback);
    }
}