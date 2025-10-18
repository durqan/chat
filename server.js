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
        message: 'Ubuntu Socket.IO Server',
        port: 8081,
        timestamp: new Date().toISOString()
    });
});

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket']
});

console.log('🚀 Ubuntu Socket.IO Server запущен');

let messages = [];

io.on('connection', (socket) => {
    console.log('✅ Новое подключение:', socket.id);

    const userId = 'user_' + Date.now();

    // Отправляем историю сообщений
    socket.emit('message_history', { messages: messages });

    socket.on('chat_message', (data) => {
        console.log('📨 Сообщение от', userId, ':', data.text);

        const newMessage = {
            id: Date.now().toString(),
            text: data.text,
            timestamp: Date.now(),
            userId: userId,
            userName: `User${userId.substr(5, 3)}`
        };

        messages.push(newMessage);

        // Ограничиваем историю
        if (messages.length > 100) {
            messages = messages.slice(-50);
        }

        // Отправляем всем
        io.emit('chat_message', { message: newMessage });
    });

    socket.on('clear_chat', () => {
        console.log('🗑️ Очистка чата');
        messages = [];
        io.emit('chat_cleared');
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Отключен:', socket.id, 'Причина:', reason);
    });
});

const PORT = 3000;

// Слушаем на всех интерфейсах
server.listen(PORT, '0.0.0.0', () => {
    console.log(`📍 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Внутренний URL: http://192.168.0.100:${PORT}`);
    console.log(`🌐 Внешний URL: http://ВАШ_ВНЕШНИЙ_IP:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});