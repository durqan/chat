import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import io from 'socket.io-client';

// 🔧 НАСТРОЙТЕ ЭТИ АДРЕСА!
const EXTERNAL_IP = '77.222.52.61'; // Ваш внешний IP
const INTERNAL_IP = '77.222.52.61';  // Ваш внутренний IP Ubuntu

const SERVER_URLS = [
    `http://${EXTERNAL_IP}:3000`,  // Внешний доступ
    `http://${INTERNAL_IP}:3000`,  // Внутренний доступ
];

const App = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Поиск сервера...');
    const [myUserId, setMyUserId] = useState(null);

    const flatListRef = useRef(null);

    useEffect(() => {
        connectToServer(0);

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const connectToServer = (urlIndex = 0) => {
        if (urlIndex >= SERVER_URLS.length) {
            console.log('❌ Все URL перебраны');
            setConnectionStatus('Сервер не найден');
            Alert.alert(
                'Ошибка подключения',
                'Не удалось подключиться к серверу.\n\nПроверьте:\n• Запущен ли сервер на Ubuntu\n• Настройки Port Forwarding в роутере\n• Правильность IP адресов'
            );
            return;
        }

        const url = SERVER_URLS[urlIndex];
        console.log(`🔄 Попытка ${urlIndex + 1}/2: ${url}`);
        setCurrentUrl(url);
        setConnectionStatus(`Подключение к ${url}...`);

        const newSocket = io(url, {
            transports: ['polling', 'websocket'],
            timeout: 8000,
            forceNew: true,
            reconnection: false
        });

        newSocket.on('connect', () => {
            console.log('✅ Успешно подключено к:', url);
            setIsConnected(true);
            setConnectionStatus('Подключено ✓');

            // Сохраняем ID сокета для идентификации своих сообщений
            setMyUserId(newSocket.id);
            console.log('🆔 Мой socket ID:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Отключено:', reason);
            setIsConnected(false);
            setConnectionStatus('Отключено: ' + reason);
        });

        newSocket.on('connect_error', (error) => {
            console.log(`❌ Ошибка подключения к ${url}:`, error.message);
            setIsConnected(false);
            setConnectionStatus(`Ошибка: ${error.message}`);

            setTimeout(() => {
                console.log('🔄 Пробуем следующий URL...');
                connectToServer(urlIndex + 1);
            }, 1000);
        });

        newSocket.on('message_history', (data) => {
            console.log('📜 Получена история сообщений:', data.messages?.length || 0);
            setMessages(data.messages || []);
        });

        newSocket.on('chat_message', (data) => {
            console.log('📨 Новое сообщение:', data.message.text);
            console.log('🆔 ID отправителя:', data.message.userId);
            console.log('🆔 Мой ID:', myUserId);

            setMessages(prev => {
                const newMessages = [...prev, data.message];
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
                return newMessages;
            });
        });

        newSocket.on('chat_cleared', () => {
            console.log('🗑️ Чат очищен');
            setMessages([]);
            Alert.alert('Чат очищен', 'Все сообщения были удалены');
        });

        setSocket(newSocket);

        setTimeout(() => {
            if (!newSocket.connected) {
                console.log('⏰ Таймаут подключения к', url);
                newSocket.disconnect();
            }
        }, 8000);
    };

    const sendMessage = () => {
        if (inputText.trim() === '') return;

        if (!isConnected || !socket) {
            Alert.alert('Ошибка', 'Нет подключения к серверу');
            return;
        }

        const messageData = {
            text: inputText.trim()
        };

        socket.emit('chat_message', messageData);
        setInputText('');
    };

    const clearChat = () => {
        Alert.alert(
            'Очистить историю',
            'Вы уверены, что хотите удалить все сообщения?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Очистить',
                    style: 'destructive',
                    onPress: () => {
                        if (socket && isConnected) {
                            socket.emit('clear_chat');
                        }
                    },
                },
            ]
        );
    };

    const retryConnection = () => {
        console.log('🔄 Ручное переподключение');
        if (socket) {
            socket.disconnect();
        }
        setIsConnected(false);
        setConnectionStatus('Переподключение...');
        setMessages([]);
        setMyUserId(null);

        setTimeout(() => {
            connectToServer(0);
        }, 500);
    };

    const initiateVideoCall = () => {
        Alert.alert(
            'Видеозвонок',
            'Для видеозвонков необходимо создать development build приложения',
            [
                { text: 'OK', style: 'default' }
            ]
        );
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderMessage = ({ item }) => {
        // Правильное определение своих сообщений
        const isUser = socket && item.userId && item.userId.includes(socket.id);

        console.log('💬 Рендер сообщения:', {
            text: item.text,
            userId: item.userId,
            mySocketId: socket?.id,
            isUser: isUser
        });

        return (
            <View style={[
                styles.messageRow,
                isUser && styles.userMessageRow
            ]}>
                {/* Чужие сообщения - слева */}
                {!isUser && (
                    <View style={styles.otherMessageContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View style={styles.otherBubble}>
                            <Text style={styles.userNameText}>
                                {item.userName || 'Аноним'}
                            </Text>
                            <Text style={styles.messageText}>
                                {item.text}
                            </Text>
                            <Text style={styles.timestamp}>
                                {formatTime(item.timestamp)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Свои сообщения - справа */}
                {isUser && (
                    <View style={styles.userMessageContainer}>
                        <View style={styles.userBubble}>
                            <Text style={styles.messageText}>
                                {item.text}
                            </Text>
                            <Text style={styles.timestamp}>
                                {formatTime(item.timestamp)}
                            </Text>
                        </View>
                        <View style={[styles.avatar, styles.userAvatar]}>
                            <Text style={styles.avatarText}>Я</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>🌐 Ubuntu Чат</Text>
                    <Text style={[styles.contactStatus,
                        { color: isConnected ? '#4CAF50' : '#FF3B30' }]}>
                        {connectionStatus}
                    </Text>
                    <Text style={styles.serverInfo}>
                        {myUserId ? `ID: ${myUserId.substring(0, 8)}...` : currentUrl}
                    </Text>
                </View>
                <View style={styles.headerButtons}>
                    {/* Кнопка видеозвонка */}
                    {isConnected && (
                        <TouchableOpacity onPress={initiateVideoCall} style={styles.videoCallButton}>
                            <Text style={styles.videoCallButtonText}>📹</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={retryConnection} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>⟳</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearChat}>
                        <Text style={styles.headerButton}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Сообщения */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {isConnected ? 'Сообщений пока нет' : 'Нет подключения к серверу'}
                        </Text>
                        <Text style={styles.emptySubText}>
                            {isConnected
                                ? 'Отправьте первое сообщение!'
                                : 'Проверьте настройки сети и сервер'
                            }
                        </Text>
                        {!isConnected && (
                            <TouchableOpacity onPress={retryConnection} style={styles.retryButtonBig}>
                                <Text style={styles.retryButtonBigText}>Повторить подключение</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Поле ввода */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[
                        styles.textInput,
                        !isConnected && styles.disabledInput
                    ]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={isConnected ? "Введите сообщение..." : "Ожидание подключения..."}
                    placeholderTextColor="#8E8E93"
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                    editable={isConnected}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        !isConnected && styles.disabledButton
                    ]}
                    onPress={sendMessage}
                    disabled={!isConnected}
                >
                    <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0E1621',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        paddingBottom: 10,
        backgroundColor: '#1E2C3A',
        borderBottomWidth: 1,
        borderBottomColor: '#16202B',
    },
    contactInfo: {
        flexDirection: 'column',
        flex: 1,
    },
    contactName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    contactStatus: {
        fontSize: 12,
        marginTop: 2,
    },
    serverInfo: {
        color: '#8E8E93',
        fontSize: 10,
        marginTop: 2,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    videoCallButton: {
        marginRight: 10,
        padding: 5,
    },
    videoCallButtonText: {
        color: '#2F89FC',
        fontSize: 18,
    },
    retryButton: {
        marginRight: 15,
        padding: 5,
    },
    retryButtonText: {
        color: '#2F89FC',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerButton: {
        color: '#FF3B30',
        fontSize: 18,
        fontWeight: 'bold',
    },
    messagesList: {
        flex: 1,
        backgroundColor: '#0E1621',
    },
    messagesContent: {
        paddingHorizontal: 8,
        paddingVertical: 16,
        flexGrow: 1,
    },
    messageRow: {
        marginVertical: 4,
        paddingHorizontal: 8,
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    // Контейнер для чужих сообщений (слева)
    otherMessageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
    },
    // Контейнер для своих сообщений (справа)
    userMessageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
    },
    userBubble: {
        backgroundColor: '#2B5278', // Синий для своих сообщений
        borderBottomRightRadius: 4,
        marginLeft: 8,
    },
    otherBubble: {
        backgroundColor: '#182533', // Темный для чужих сообщений
        borderBottomLeftRadius: 4,
        marginRight: 8,
    },
    messageText: {
        color: 'white',
        fontSize: 16,
        lineHeight: 20,
    },
    userNameText: {
        color: '#2F89FC',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    timestamp: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
        alignSelf: 'flex-end',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2F89FC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: {
        backgroundColor: '#2B5278', // Темно-синий для своего аватара
    },
    avatarText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1E2C3A',
        borderTopWidth: 1,
        borderTopColor: '#16202B',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#1E2C3A',
        borderWidth: 1,
        borderColor: '#2F89FC',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
        color: 'white',
        marginHorizontal: 8,
    },
    disabledInput: {
        borderColor: '#666',
        color: '#666',
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2F89FC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#666',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    retryButtonBig: {
        backgroundColor: '#2F89FC',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryButtonBigText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default App;