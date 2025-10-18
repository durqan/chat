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
import { styled } from 'nativewind';
import io from 'socket.io-client';

// Стилизованные компоненты
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

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
            Alert.alert(
                'Ошибка подключения',
                'Не удалось подключиться к серверу'
            );
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
        Alert.alert(
            'Видеозвонок',
            'Для видеозвонков необходимо создать development build приложения'
        );
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
                <StyledView className="flex-row justify-end items-end mb-2 px-2">
                    <StyledView className="bg-blue-600 max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 mr-2">
                        <StyledText className="text-white text-base">
                            {item.text}
                        </StyledText>
                        <StyledText className="text-gray-300 text-xs mt-1 text-right">
                            {formatTime(item.timestamp)}
                        </StyledText>
                    </StyledView>
                    <StyledView className="w-9 h-9 bg-blue-700 rounded-full justify-center items-center">
                        <StyledText className="text-white text-sm font-bold">Я</StyledText>
                    </StyledView>
                </StyledView>
            );
        } else {
            // Чужие сообщения - слева
            return (
                <StyledView className="flex-row justify-start items-end mb-2 px-2">
                    <StyledView className="w-9 h-9 bg-blue-500 rounded-full justify-center items-center mr-2">
                        <StyledText className="text-white text-sm font-bold">
                            {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                        </StyledText>
                    </StyledView>
                    <StyledView className="bg-gray-800 max-w-[75%] rounded-2xl rounded-bl-sm px-3 py-2">
                        <StyledText className="text-blue-400 text-xs font-bold mb-1">
                            {item.userName || 'Аноним'}
                        </StyledText>
                        <StyledText className="text-white text-base">
                            {item.text}
                        </StyledText>
                        <StyledText className="text-gray-400 text-xs mt-1 text-right">
                            {formatTime(item.timestamp)}
                        </StyledText>
                    </StyledView>
                </StyledView>
            );
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-gray-900"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <StyledView className="flex-row justify-between items-center px-4 pt-12 pb-3 bg-gray-800 border-b border-gray-700">
                <StyledView className="flex-1">
                    <StyledText className="text-white text-lg font-bold">🌐 Ubuntu Чат</StyledText>
                    <StyledText className={`text-sm mt-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {connectionStatus}
                    </StyledText>
                    <StyledText className="text-gray-400 text-xs mt-1">
                        {myUserId ? `ID: ${myUserId.substring(0, 8)}...` : currentUrl}
                    </StyledText>
                </StyledView>
                <StyledView className="flex-row items-center">
                    {isConnected && (
                        <StyledTouchableOpacity
                            onPress={initiateVideoCall}
                            className="mr-3 p-1"
                        >
                            <StyledText className="text-blue-400 text-lg">📹</StyledText>
                        </StyledTouchableOpacity>
                    )}
                    <StyledTouchableOpacity
                        onPress={retryConnection}
                        className="mr-3 p-1"
                    >
                        <StyledText className="text-blue-400 text-lg font-bold">⟳</StyledText>
                    </StyledTouchableOpacity>
                    <StyledTouchableOpacity onPress={clearChat}>
                        <StyledText className="text-red-400 text-lg font-bold">🗑️</StyledText>
                    </StyledTouchableOpacity>
                </StyledView>
            </StyledView>

            {/* Сообщения */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                className="flex-1 bg-gray-900"
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListEmptyComponent={
                    <StyledView className="flex-1 justify-center items-center px-10">
                        <StyledText className="text-white text-xl font-bold text-center mb-2">
                            {isConnected ? 'Сообщений пока нет' : 'Нет подключения к серверу'}
                        </StyledText>
                        <StyledText className="text-gray-400 text-center text-base leading-5 mb-5">
                            {isConnected
                                ? 'Отправьте первое сообщение!'
                                : 'Проверьте настройки сети и сервер'
                            }
                        </StyledText>
                        {!isConnected && (
                            <StyledTouchableOpacity
                                onPress={retryConnection}
                                className="bg-blue-500 px-6 py-3 rounded-2xl"
                            >
                                <StyledText className="text-white text-lg font-bold">
                                    Повторить подключение
                                </StyledText>
                            </StyledTouchableOpacity>
                        )}
                    </StyledView>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Поле ввода */}
            <StyledView className="flex-row items-end px-3 py-2 bg-gray-800 border-t border-gray-700">
                <StyledTextInput
                    className={`flex-1 bg-gray-800 border-2 rounded-2xl px-4 py-3 text-white text-base max-h-24 ${
                        isConnected ? 'border-blue-500' : 'border-gray-600 text-gray-600'
                    }`}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={isConnected ? "Введите сообщение..." : "Ожидание подключения..."}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                    editable={isConnected}
                />
                <StyledTouchableOpacity
                    className={`w-10 h-10 rounded-full justify-center items-center ml-2 ${
                        isConnected ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                    onPress={sendMessage}
                    disabled={!isConnected}
                >
                    <StyledText className="text-white text-base font-bold">➤</StyledText>
                </StyledTouchableOpacity>
            </StyledView>
        </KeyboardAvoidingView>
    );
};

export default App;