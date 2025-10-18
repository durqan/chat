import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Icon, Card, ListItem, Avatar } from 'react-native-elements';
import io from 'socket.io-client';

// 🔧 НАСТРОЙТЕ ЭТИ АДРЕСА!
const EXTERNAL_IP = '77.222.52.61';
const INTERNAL_IP = '77.222.52.61';

const SERVER_URLS = [
    `http://${EXTERNAL_IP}:3000`,
    `http://${INTERNAL_IP}:3000`,
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
            setConnectionStatus('Сервер не найден');
            Alert.alert('Ошибка подключения', 'Не удалось подключиться к серверу');
            return;
        }

        const url = SERVER_URLS[urlIndex];
        setCurrentUrl(url);
        setConnectionStatus(`Подключение к ${url}...`);

        const newSocket = io(url, {
            transports: ['polling', 'websocket'],
            timeout: 8000,
            forceNew: true,
            reconnection: false
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            setConnectionStatus('Подключено ✓');
            setMyUserId(newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            setIsConnected(false);
            setConnectionStatus('Отключено: ' + reason);
        });

        newSocket.on('connect_error', (error) => {
            setIsConnected(false);
            setConnectionStatus(`Ошибка: ${error.message}`);
            setTimeout(() => connectToServer(urlIndex + 1), 1000);
        });

        newSocket.on('message_history', (data) => {
            setMessages(data.messages || []);
        });

        newSocket.on('chat_message', (data) => {
            setMessages(prev => {
                const newMessages = [...prev, data.message];
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
                return newMessages;
            });
        });

        newSocket.on('chat_cleared', () => {
            setMessages([]);
            Alert.alert('Чат очищен', 'Все сообщения были удалены');
        });

        setSocket(newSocket);

        setTimeout(() => {
            if (!newSocket.connected) {
                newSocket.disconnect();
            }
        }, 8000);
    };

    const sendMessage = () => {
        if (inputText.trim() === '' || !isConnected || !socket) {
            Alert.alert('Ошибка', 'Нет подключения к серверу');
            return;
        }

        const messageData = { text: inputText.trim() };
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
        if (socket) socket.disconnect();
        setIsConnected(false);
        setConnectionStatus('Переподключение...');
        setMessages([]);
        setMyUserId(null);
        setTimeout(() => connectToServer(0), 500);
    };

    const initiateVideoCall = () => {
        Alert.alert('Видеозвонок', 'Для видеозвонков необходимо создать development build приложения');
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }) => {
        const isUser = socket && item.userId && item.userId.includes(socket.id);

        if (isUser) {
            // Мои сообщения - справа
            return (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginVertical: 4, paddingHorizontal: 8 }}>
                    <View style={{ backgroundColor: '#2B5278', maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderBottomRightRadius: 4, marginRight: 8 }}>
                        <Text style={{ color: 'white', fontSize: 16 }}>{item.text}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, textAlign: 'right' }}>
                            {formatTime(item.timestamp)}
                        </Text>
                    </View>
                    <Avatar
                        rounded
                        title="Я"
                        size="small"
                        containerStyle={{ backgroundColor: '#2B5278' }}
                    />
                </View>
            );
        } else {
            // Чужие сообщения - слева
            return (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', marginVertical: 4, paddingHorizontal: 8 }}>
                    <Avatar
                        rounded
                        title={item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                        size="small"
                        containerStyle={{ backgroundColor: '#2F89FC', marginRight: 8 }}
                    />
                    <View style={{ backgroundColor: '#182533', maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderBottomLeftRadius: 4 }}>
                        <Text style={{ color: '#2F89FC', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                            {item.userName || 'Аноним'}
                        </Text>
                        <Text style={{ color: 'white', fontSize: 16 }}>{item.text}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, textAlign: 'right' }}>
                            {formatTime(item.timestamp)}
                        </Text>
                    </View>
                </View>
            );
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#0E1621' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingTop: Platform.OS === 'ios' ? 50 : 10,
                paddingBottom: 10,
                backgroundColor: '#1E2C3A',
                borderBottomWidth: 1,
                borderBottomColor: '#16202B'
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🌐 Ubuntu Чат</Text>
                    <Text style={{
                        color: isConnected ? '#4CAF50' : '#FF3B30',
                        fontSize: 12,
                        marginTop: 2
                    }}>
                        {connectionStatus}
                    </Text>
                    <Text style={{ color: '#8E8E93', fontSize: 10, marginTop: 2 }}>
                        {myUserId ? `ID: ${myUserId.substring(0, 8)}...` : currentUrl}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isConnected && (
                        <TouchableOpacity onPress={initiateVideoCall} style={{ marginRight: 15, padding: 5 }}>
                            <Icon name="videocam" type="material" color="#2F89FC" size={20} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={retryConnection} style={{ marginRight: 15, padding: 5 }}>
                        <Icon name="refresh" type="material" color="#2F89FC" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearChat} style={{ padding: 5 }}>
                        <Icon name="delete" type="material" color="#FF3B30" size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Сообщения */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={{ flex: 1, backgroundColor: '#0E1621' }}
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                            {isConnected ? 'Сообщений пока нет' : 'Нет подключения к серверу'}
                        </Text>
                        <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                            {isConnected ? 'Отправьте первое сообщение!' : 'Проверьте настройки сети и сервер'}
                        </Text>
                        {!isConnected && (
                            <TouchableOpacity
                                onPress={retryConnection}
                                style={{ backgroundColor: '#2F89FC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                            >
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                    Повторить подключение
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Поле ввода */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: '#1E2C3A',
                borderTopWidth: 1,
                borderTopColor: '#16202B'
            }}>
                <TextInput
                    style={{
                        flex: 1,
                        backgroundColor: '#1E2C3A',
                        borderWidth: 1,
                        borderColor: isConnected ? '#2F89FC' : '#666',
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        maxHeight: 100,
                        fontSize: 16,
                        color: isConnected ? 'white' : '#666',
                        marginHorizontal: 8,
                    }}
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
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isConnected ? '#2F89FC' : '#666',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={sendMessage}
                    disabled={!isConnected}
                >
                    <Icon name="send" type="material" color="white" size={18} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default App;