const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS для React Native
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Ubuntu Socket.IO Server with Video Calls',
        port: 3000,
        timestamp: new Date().toISOString(),
        features: ['chat', 'video_calls', 'manual_clear']
    });
});

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket']
});

console.log('🚀 Ubuntu Socket.IO Server с видеозвонками запущен');

let messages = [];
let connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);

    const userId = 'user_' + Date.now();
    const userName = `User${userId.substr(5, 3)}`;

    // Сохраняем информацию о пользователе
    connectedUsers.set(socket.id, {
        id: userId,
        name: userName,
        socketId: socket.id,
        connectedAt: new Date()
    });

    // Уведомляем всех о новом пользователе
    socket.broadcast.emit('user_connected', {
        userId: userId,
        userName: userName,
        connectedUsers: Array.from(connectedUsers.values())
    });

    // Отправляем историю сообщений и список пользователей
    socket.emit('message_history', {
        messages: messages,
        connectedUsers: Array.from(connectedUsers.values())
    });

    // ==================== ОБРАБОТЧИКИ ЧАТА ====================

    socket.on('chat_message', (data) => {
        console.log('📨 Сообщение от', userName, ':', data.text);

        const newMessage = {
            id: Date.now().toString(),
            text: data.text,
            timestamp: Date.now(),
            userId: userId,
            userName: userName
        };

        messages.push(newMessage);

        // Ограничиваем историю (только для производительности)
        if (messages.length > 1000) {
            messages = messages.slice(-500);
        }

        // Отправляем всем
        io.emit('chat_message', { message: newMessage });
    });

    socket.on('clear_chat', () => {
        console.log('🗑️ Очистка чата инициирована:', userName);
        messages = [];
        io.emit('chat_cleared');
    });

    // ==================== ОБРАБОТЧИКИ ВИДЕОЗВОНКОВ ====================

    socket.on('initiate_call', (data) => {
        console.log('📞 Инициация звонка от:', userName);

        // Уведомляем всех пользователей о входящем звонке
        socket.broadcast.emit('incoming_call', {
            from: userId,
            fromName: userName,
            callId: Date.now().toString()
        });
    });

    socket.on('accept_call', (data) => {
        console.log('✅ Звонок принят:', userName);

        // Уведомляем инициатора о принятии звонка
        const targetSocket = findSocketByUserId(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call_accepted', {
                from: userId,
                fromName: userName
            });
        }
    });

    socket.on('reject_call', (data) => {
        console.log('❌ Звонок отклонен:', userName);

        // Уведомляем инициатора об отклонении звонка
        const targetSocket = findSocketByUserId(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call_rejected', {
                from: userId,
                fromName: userName
            });
        }
    });

    socket.on('end_call', (data) => {
        console.log('📞 Звонок завершен:', userName);

        // Уведомляем всех участников о завершении звонка
        if (data.to === 'all') {
            socket.broadcast.emit('call_ended', {
                from: userId,
                fromName: userName
            });
        } else {
            const targetSocket = findSocketByUserId(data.to);
            if (targetSocket) {
                io.to(targetSocket).emit('call_ended', {
                    from: userId,
                    fromName: userName
                });
            }
        }
    });

    // ==================== WEBRTC СИГНАЛИЗАЦИЯ ====================

    socket.on('offer', (data) => {
        console.log('🎯 Offer от:', userName);

        // Пересылаем offer целевому пользователю
        const targetSocket = findSocketByUserId(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('offer', {
                offer: data.offer,
                from: userId,
                fromName: userName
            });
        } else if (data.to === 'all') {
            // Рассылаем всем кроме отправителя
            socket.broadcast.emit('offer', {
                offer: data.offer,
                from: userId,
                fromName: userName
            });
        }
    });

    socket.on('answer', (data) => {
        console.log('🎯 Answer от:', userName);

        // Пересылаем answer целевому пользователю
        const targetSocket = findSocketByUserId(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('answer', {
                answer: data.answer,
                from: userId,
                fromName: userName
            });
        }
    });

    socket.on('ice_candidate', (data) => {
        console.log('🧊 ICE candidate от:', userName);

        // Пересылаем ICE кандидат целевому пользователю
        const targetSocket = findSocketByUserId(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('ice_candidate', {
                candidate: data.candidate,
                from: userId,
                fromName: userName
            });
        } else if (data.to === 'all') {
            // Рассылаем всем кроме отправителя
            socket.broadcast.emit('ice_candidate', {
                candidate: data.candidate,
                from: userId,
                fromName: userName
            });
        }
    });

    // ==================== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ====================

    socket.on('get_connected_users', () => {
        socket.emit('connected_users', {
            users: Array.from(connectedUsers.values())
        });
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Отключен:', socket.id, 'Пользователь:', userName, 'Причина:', reason);

        // Удаляем пользователя из списка
        connectedUsers.delete(socket.id);

        // Уведомляем всех об отключении пользователя
        socket.broadcast.emit('user_disconnected', {
            userId: userId,
            userName: userName,
            connectedUsers: Array.from(connectedUsers.values())
        });
    });

    // Обработка ошибок
    socket.on('error', (error) => {
        console.error('❌ Ошибка сокета:', socket.id, error);
    });
});

// Вспомогательная функция для поиска socket.id по userId
function findSocketByUserId(userId) {
    for (let [socketId, userData] of connectedUsers.entries()) {
        if (userData.id === userId) {
            return socketId;
        }
    }
    return null;
}

// Очистка неактивных подключений каждые 5 минут
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (let [socketId, userData] of connectedUsers.entries()) {
        // Если подключение старше 30 минут, считаем его неактивным
        if (now - userData.connectedAt.getTime() > 30 * 60 * 1000) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect(true);
                connectedUsers.delete(socketId);
                cleanedCount++;
            }
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Очищено неактивных подключений: ${cleanedCount}`);
    }
}, 5 * 60 * 1000);

const PORT = 3000;

// Слушаем на всех интерфейсах
server.listen(PORT, '0.0.0.0', () => {
    console.log(`📍 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Внутренний URL: http://192.168.0.100:${PORT}`);
    console.log(`🌐 Внешний URL: http://77.222.52.61:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    console.log('🎯 Поддерживаемые функции:');
    console.log('   ✓ Чат в реальном времени');
    console.log('   ✓ Видеозвонки WebRTC');
    console.log('   ✓ Сигнализация WebRTC');
    console.log('   ✓ Список подключенных пользователей');
    console.log('   ✓ Очистка чата по кнопке');
});

// Обработка graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Выключение сервера...');
    io.disconnectSockets();
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('🛑 Выключение сервера...');
    io.disconnectSockets();
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});