const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

class ChatServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.port = process.env.PORT || 3000;

        // Структура данных для комнат
        this.rooms = new Map(); // roomId -> { messages: [], users: Map() }
        this.connectedUsers = new Map(); // socket.id -> userInfo

        // Дефолтные комнаты
        this.defaultRooms = ['general', 'random', 'help'];

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.initializeDefaultRooms();
    }

    initializeDefaultRooms() {
        this.defaultRooms.forEach(roomId => {
            if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, {
                    id: roomId,
                    name: this.formatRoomName(roomId),
                    messages: [],
                    users: new Map(),
                    createdAt: new Date()
                });
            }
        });
    }

    formatRoomName(roomId) {
        return roomId.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                totalUsers: this.connectedUsers.size,
                totalRooms: this.rooms.size,
                timestamp: new Date().toISOString()
            });
        });

        // Получить статистику сервера
        this.app.get('/stats', (req, res) => {
            res.json({
                connectedUsers: this.connectedUsers.size,
                totalMessages: Array.from(this.rooms.values()).reduce((acc, room) => acc + room.messages.length, 0),
                totalRooms: this.rooms.size,
                serverUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                activeConnections: this.io.engine.clientsCount
            });
        });

        // Получить список комнат
        this.app.get('/rooms', (req, res) => {
            const rooms = Array.from(this.rooms.values()).map(room => ({
                id: room.id,
                name: room.name,
                userCount: room.users.size,
                messageCount: room.messages.length,
                createdAt: room.createdAt
            }));
            res.json({ rooms });
        });

        // Получить информацию о комнате
        this.app.get('/rooms/:roomId', (req, res) => {
            const roomId = req.params.roomId;
            const room = this.rooms.get(roomId);

            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            res.json({
                id: room.id,
                name: room.name,
                userCount: room.users.size,
                messageCount: room.messages.length,
                users: Array.from(room.users.values()).map(user => ({
                    id: user.id,
                    name: user.name
                })),
                createdAt: room.createdAt
            });
        });

        // Создать новую комнату
        this.app.post('/rooms', (req, res) => {
            const { roomId, roomName } = req.body;

            if (!roomId || roomId.length < 2 || roomId.length > 20) {
                return res.status(400).json({ error: 'Room ID must be between 2 and 20 characters' });
            }

            if (this.rooms.has(roomId)) {
                return res.status(409).json({ error: 'Room already exists' });
            }

            const room = {
                id: roomId,
                name: roomName || this.formatRoomName(roomId),
                messages: [],
                users: new Map(),
                createdAt: new Date()
            };

            this.rooms.set(roomId, room);

            // Уведомляем всех о новой комнате
            this.sendRoomList();

            res.json({
                message: 'Room created successfully',
                room: {
                    id: room.id,
                    name: room.name,
                    userCount: 0,
                    messageCount: 0,
                    createdAt: room.createdAt
                }
            });
        });

        // Получить сообщения комнаты
        this.app.get('/rooms/:roomId/messages', (req, res) => {
            const roomId = req.params.roomId;
            const room = this.rooms.get(roomId);

            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            const paginatedMessages = room.messages
                .slice(offset, offset + limit)
                .reverse();

            res.json({
                messages: paginatedMessages,
                total: room.messages.length,
                hasMore: offset + limit < room.messages.length
            });
        });

        // Очистить сообщения комнаты
        this.app.delete('/rooms/:roomId/messages', (req, res) => {
            const roomId = req.params.roomId;
            const room = this.rooms.get(roomId);

            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const deletedCount = room.messages.length;
            room.messages = [];

            // Уведомляем всех в комнате
            this.io.to(roomId).emit('chat_cleared');

            res.json({
                deletedCount,
                message: 'Room messages cleared successfully'
            });
        });

        // Исправленный 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /health',
                    'GET /stats',
                    'GET /rooms',
                    'GET /rooms/:roomId',
                    'POST /rooms',
                    'GET /rooms/:roomId/messages',
                    'DELETE /rooms/:roomId/messages'
                ]
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Новое подключение: ${socket.id}`);

            const userName = `User${Math.floor(Math.random() * 1000)}`;
            const userInfo = {
                id: socket.id,
                name: userName,
                connectedAt: new Date(),
                ip: socket.handshake.address,
                currentRoom: null
            };

            this.connectedUsers.set(socket.id, userInfo);

            // Отправляем список комнат новому клиенту
            this.sendRoomList(socket);

            console.log(`👤 Пользователь ${userName} (${socket.id}) подключился`);

            // Обработчики комнат
            socket.on('join_room', (data) => {
                this.handleJoinRoom(socket, data);
            });

            socket.on('leave_room', (data) => {
                this.handleLeaveRoom(socket, data);
            });

            socket.on('create_room', (data) => {
                this.handleCreateRoom(socket, data);
            });

            // Обработчик сообщений
            socket.on('chat_message', (data) => {
                this.handleChatMessage(socket, data);
            });

            socket.on('clear_chat', () => {
                this.handleClearChat(socket);
            });

            socket.on('disconnect', (reason) => {
                this.handleDisconnect(socket, reason);
            });

            socket.on('error', (error) => {
                console.error(`❌ Ошибка у клиента ${socket.id}:`, error);
            });
        });
    }

    sendRoomList(socket = null) {
        const roomsData = Array.from(this.rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            userCount: room.users.size,
            messageCount: room.messages.length,
            createdAt: room.createdAt
        }));

        if (socket) {
            socket.emit('room_list', { rooms: roomsData });
        } else {
            this.io.emit('room_list', { rooms: roomsData });
        }
    }

    handleJoinRoom(socket, data) {
        try {
            const roomId = data.roomId;
            const user = this.connectedUsers.get(socket.id);

            if (!roomId) {
                socket.emit('error', { message: 'Room ID is required' });
                return;
            }

            // Проверяем существование комнаты
            if (!this.rooms.has(roomId)) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            const room = this.rooms.get(roomId);

            // Выходим из предыдущей комнаты
            if (user.currentRoom) {
                this.leaveRoom(socket, user.currentRoom);
            }

            // Присоединяемся к новой комнате
            socket.join(roomId);

            // Добавляем пользователя в комнату
            room.users.set(socket.id, user);
            user.currentRoom = roomId;

            console.log(`👤 ${user.name} присоединился к комнате ${roomId}`);

            // Отправляем историю сообщений комнаты
            socket.emit('message_history', {
                roomId: roomId,
                messages: room.messages.slice(-100)
            });

            // Уведомляем комнату о новом пользователе
            socket.to(roomId).emit('user_joined', {
                user: { id: user.id, name: user.name },
                roomId: roomId,
                userCount: room.users.size
            });

            // Обновляем список пользователей комнаты
            this.broadcastRoomUsers(roomId);

            // Обновляем список комнат для всех
            this.sendRoomList();

        } catch (error) {
            console.error('Ошибка при присоединении к комнате:', error);
            socket.emit('error', { message: 'Ошибка при присоединении к комнате' });
        }
    }

    handleLeaveRoom(socket, data) {
        try {
            const roomId = data.roomId || this.connectedUsers.get(socket.id)?.currentRoom;

            if (!roomId) {
                socket.emit('error', { message: 'Not in any room' });
                return;
            }

            this.leaveRoom(socket, roomId);

        } catch (error) {
            console.error('Ошибка при выходе из комнаты:', error);
            socket.emit('error', { message: 'Ошибка при выходе из комнаты' });
        }
    }

    leaveRoom(socket, roomId) {
        const room = this.rooms.get(roomId);
        const user = this.connectedUsers.get(socket.id);

        if (!room || !user) return;

        // Удаляем пользователя из комнаты
        room.users.delete(socket.id);
        user.currentRoom = null;

        // Выходим из комнаты Socket.IO
        socket.leave(roomId);

        console.log(`👤 ${user.name} покинул комнату ${roomId}`);

        // Уведомляем комнату о выходе пользователя
        socket.to(roomId).emit('user_left', {
            user: { id: user.id, name: user.name },
            roomId: roomId,
            userCount: room.users.size
        });

        // Обновляем список пользователей комнаты
        this.broadcastRoomUsers(roomId);

        // Обновляем список комнат для всех
        this.sendRoomList();
    }

    handleCreateRoom(socket, data) {
        try {
            const { roomId, roomName } = data;

            if (!roomId || roomId.length < 2 || roomId.length > 20) {
                socket.emit('error', { message: 'Room ID must be between 2 and 20 characters' });
                return;
            }

            if (this.rooms.has(roomId)) {
                socket.emit('error', { message: 'Room already exists' });
                return;
            }

            const room = {
                id: roomId,
                name: roomName || this.formatRoomName(roomId),
                messages: [],
                users: new Map(),
                createdAt: new Date()
            };

            this.rooms.set(roomId, room);

            console.log(`🏠 Создана новая комната: ${roomId} (${room.name})`);

            // Уведомляем всех о новой комнате
            this.sendRoomList();

            socket.emit('room_created', {
                room: {
                    id: room.id,
                    name: room.name,
                    userCount: 0,
                    messageCount: 0,
                    createdAt: room.createdAt
                }
            });

        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
            socket.emit('error', { message: 'Ошибка при создании комнаты' });
        }
    }

    handleChatMessage(socket, data) {
        try {
            const user = this.connectedUsers.get(socket.id);
            const roomId = user?.currentRoom;

            console.log('=== SERVER: HANDLE CHAT MESSAGE ===');
            console.log('User:', user?.name);
            console.log('Current room:', roomId);
            console.log('Message text:', data?.text);

            if (!roomId) {
                console.log('SERVER: User not in any room');
                socket.emit('error', { message: 'You are not in any room' });
                return;
            }

            const room = this.rooms.get(roomId);
            if (!room) {
                console.log('SERVER: Room not found:', roomId);
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            if (!data.text || data.text.trim() === '') {
                socket.emit('error', { message: 'Message cannot be empty' });
                return;
            }

            const message = {
                id: this.generateMessageId(),
                text: data.text.trim(),
                userId: socket.id,
                userName: user?.name || 'Аноним',
                roomId: roomId,
                timestamp: new Date().toISOString()
            };

            console.log(`💬 [${roomId}] ${user?.name}: ${data.text}`);

            // Сохраняем сообщение в комнате
            room.messages.push(message);

            // Ограничиваем историю комнаты
            if (room.messages.length > 1000) {
                room.messages = room.messages.slice(-1000);
            }

            // Отправляем сообщение всем участникам комнаты, включая отправителя
            console.log('Sending to room:', roomId);
            console.log('Room participants:', Array.from(room.users.keys()));

            // Используем io.to() вместо socket.to() чтобы отправить всем включая отправителя
            this.io.to(roomId).emit('chat_message', { message });
            console.log('✅ Message sent to room participants');

        } catch (error) {
            console.error('Ошибка при обработке сообщения:', error);
            socket.emit('error', { message: 'Ошибка при отправке сообщения' });
        }
    }

    handleClearChat(socket) {
        try {
            const user = this.connectedUsers.get(socket.id);
            const roomId = user?.currentRoom;

            if (!roomId) {
                socket.emit('error', { message: 'You are not in any room' });
                return;
            }

            const room = this.rooms.get(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            console.log(`🗑️ [${roomId}] ${user.name} очистил чат`);

            room.messages = [];

            // Уведомляем только участников комнаты
            this.io.to(roomId).emit('chat_cleared');

        } catch (error) {
            console.error('Ошибка при очистке чата:', error);
            socket.emit('error', { message: 'Ошибка при очистке чата' });
        }
    }

    broadcastRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const users = Array.from(room.users.values()).map(user => ({
            id: user.id,
            name: user.name
        }));

        this.io.to(roomId).emit('room_users', {
            roomId: roomId,
            users: users,
            userCount: users.length
        });
    }

    handleDisconnect(socket, reason) {
        const user = this.connectedUsers.get(socket.id);

        if (user && user.currentRoom) {
            this.leaveRoom(socket, user.currentRoom);
        }

        this.connectedUsers.delete(socket.id);
        console.log(`🔌 Отключение: ${user?.name || socket.id} (${reason})`);

        // Обновляем список комнат для всех
        this.sendRoomList();
    }

    generateMessageId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    start() {
        this.server.listen(this.port, () => {
            console.log('🚀 Сервер чата с комнатами запущен!');
            console.log(`📍 Порт: ${this.port}`);
            console.log(`🌐 URL: http://localhost:${this.port}`);
            console.log(`🏠 Доступно комнат: ${this.rooms.size}`);
            console.log('=' .repeat(50));
        });

        process.on('SIGTERM', () => {
            console.log('🛑 Получен SIGTERM, завершаем работу...');
            this.gracefulShutdown();
        });

        process.on('SIGINT', () => {
            console.log('🛑 Получен SIGINT, завершаем работу...');
            this.gracefulShutdown();
        });
    }

    gracefulShutdown() {
        console.log('⏳ Завершаем работу сервера...');

        this.io.emit('server_shutdown', {
            message: 'Сервер перезапускается...',
            timestamp: new Date().toISOString()
        });

        setTimeout(() => {
            this.server.close(() => {
                console.log('✅ Сервер успешно остановлен');
                process.exit(0);
            });
        }, 1000);
    }
}

// Запуск сервера
if (require.main === module) {
    const chatServer = new ChatServer();
    chatServer.start();
}

module.exports = ChatServer;