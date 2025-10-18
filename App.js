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
import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
    RTCView,
} from 'react-native-webrtc';

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

    // Состояния для видеозвонка
    const [isInCall, setIsInCall] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callStatus, setCallStatus] = useState('');

    const flatListRef = useRef(null);
    const peerConnectionRef = useRef(null);

    useEffect(() => {
        connectToServer(0);

        return () => {
            if (socket) {
                socket.disconnect();
            }
            cleanupVideoCall();
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

            initializeVideoCallHandlers(newSocket);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Отключено:', reason);
            setIsConnected(false);
            setConnectionStatus('Отключено: ' + reason);
            cleanupVideoCall();
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

    // ==================== ВИДЕОЗВОНОК ====================

    const initializeVideoCallHandlers = (socket) => {
        socket.on('incoming_call', (data) => {
            console.log('📞 Входящий звонок от:', data.fromName);
            Alert.alert(
                'Входящий видеозвонок',
                `Пользователь ${data.fromName} звонит вам`,
                [
                    {
                        text: 'Отклонить',
                        style: 'cancel',
                        onPress: () => {
                            socket.emit('reject_call', { to: data.from });
                        }
                    },
                    {
                        text: 'Принять',
                        onPress: () => {
                            acceptCall(data.from);
                        }
                    }
                ]
            );
        });

        socket.on('call_accepted', async (data) => {
            console.log('✅ Звонок принят');
            setCallStatus('Соединение...');
            await startCall();
        });

        socket.on('call_rejected', (data) => {
            console.log('❌ Звонок отклонен');
            setCallStatus('Звонок отклонен');
            Alert.alert('Информация', 'Звонок был отклонен');
            cleanupVideoCall();
        });

        socket.on('ice_candidate', async (data) => {
            if (peerConnectionRef.current && data.candidate) {
                try {
                    await peerConnectionRef.current.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );
                } catch (error) {
                    console.error('Ошибка добавления ICE кандидата:', error);
                }
            }
        });

        socket.on('offer', async (data) => {
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription(data.offer)
                    );
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);

                    socket.emit('answer', {
                        answer: answer,
                        to: data.from
                    });
                } catch (error) {
                    console.error('Ошибка обработки offer:', error);
                }
            }
        });

        socket.on('answer', async (data) => {
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                } catch (error) {
                    console.error('Ошибка обработки answer:', error);
                }
            }
        });

        socket.on('call_ended', (data) => {
            console.log('📞 Звонок завершен');
            setCallStatus('Звонок завершен');
            Alert.alert('Информация', 'Собеседник завершил звонок');
            cleanupVideoCall();
        });
    };

    const initializePeerConnection = () => {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        pc.oniceconnectionstatechange = () => {
            console.log('ICE состояние:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallStatus('Соединение установлено');
                setIsCallActive(true);
            } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setCallStatus('Соединение потеряно');
                setIsCallActive(false);
            }
        };

        pc.ontrack = (event) => {
            console.log('✅ Получен удаленный видеопоток');
            setRemoteStream(event.streams[0]);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice_candidate', {
                    candidate: event.candidate,
                    to: 'all'
                });
            }
        };

        return pc;
    };

    const getLocalStream = async () => {
        try {
            console.log('🎥 Запрос доступа к камере...');
            const stream = await mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    facingMode: 'user',
                },
                audio: true,
            });
            console.log('✅ Доступ к камере получен');
            return stream;
        } catch (error) {
            console.error('❌ Ошибка доступа к камере:', error);
            Alert.alert(
                'Ошибка доступа',
                'Не удалось получить доступ к камере и микрофону. Проверьте разрешения приложения.'
            );
            return null;
        }
    };

    const startCall = async () => {
        try {
            setIsInCall(true);
            setCallStatus('Подготовка...');

            const stream = await getLocalStream();
            if (!stream) {
                cleanupVideoCall();
                return;
            }

            setLocalStream(stream);
            peerConnectionRef.current = initializePeerConnection();

            // Добавляем локальные треки в peer connection
            stream.getTracks().forEach(track => {
                peerConnectionRef.current.addTrack(track, stream);
            });

            // Создаем предложение
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);

            // Отправляем предложение через сокет
            if (socket) {
                socket.emit('offer', {
                    offer,
                    to: 'all'
                });
            }

            setCallStatus('Установка соединения...');

        } catch (error) {
            console.error('❌ Ошибка начала звонка:', error);
            Alert.alert('Ошибка', 'Не удалось начать видеозвонок');
            cleanupVideoCall();
        }
    };

    const acceptCall = async (from) => {
        console.log('✅ Принятие звонка от:', from);
        await startCall();
    };

    const initiateVideoCall = () => {
        if (!isConnected) {
            Alert.alert('Ошибка', 'Нет подключения к серверу');
            return;
        }

        Alert.alert(
            'Видеозвонок',
            'Начать видеозвонок со всеми участниками чата?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Позвонить',
                    onPress: () => {
                        if (socket) {
                            socket.emit('initiate_call', { to: 'all' });
                            startCall();
                        }
                    }
                }
            ]
        );
    };

    const endCall = () => {
        if (socket) {
            socket.emit('end_call', { to: 'all' });
        }
        cleanupVideoCall();
        Alert.alert('Информация', 'Звонок завершен');
    };

    const cleanupVideoCall = () => {
        console.log('🧹 Очистка видеозвонка');

        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
            setLocalStream(null);
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        setRemoteStream(null);
        setIsInCall(false);
        setIsCallActive(false);
        setCallStatus('');
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
        cleanupVideoCall();

        setTimeout(() => {
            connectToServer(0);
        }, 500);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderMessage = ({ item }) => {
        const isUser = item.userId && socket && item.userId.includes(socket.id);

        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.otherContainer
            ]}>
                {!isUser && (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.userName ? item.userName.charAt(0) : 'U'}
                        </Text>
                    </View>
                )}

                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.otherBubble
                ]}>
                    {!isUser && (
                        <Text style={styles.userNameText}>
                            {item.userName || 'Другой пользователь'}
                        </Text>
                    )}
                    <Text style={styles.messageText}>
                        {item.text}
                    </Text>
                    <Text style={styles.timestamp}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>

                {isUser && (
                    <View style={[styles.avatar, styles.userAvatar]}>
                        <Text style={styles.avatarText}>Я</Text>
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
                    <Text style={styles.contactName}>🌐 Ubuntu Чат + Видео</Text>
                    <Text style={[styles.contactStatus,
                        { color: isConnected ? '#4CAF50' : '#FF3B30' }]}>
                        {connectionStatus}
                    </Text>
                    <Text style={styles.serverInfo}>
                        {currentUrl}
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

            {/* Видеозвонок */}
            {isInCall && (
                <View style={styles.videoCallContainer}>
                    <View style={styles.videoHeader}>
                        <Text style={styles.videoHeaderText}>
                            📹 Видеозвонок {callStatus && `- ${callStatus}`}
                        </Text>
                        <TouchableOpacity onPress={endCall} style={styles.endCallButton}>
                            <Text style={styles.endCallButtonText}>📞</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.videoGrid}>
                        {/* Удаленное видео */}
                        {remoteStream ? (
                            <RTCView
                                streamURL={remoteStream.toURL()}
                                style={styles.remoteVideo}
                                objectFit={'cover'}
                            />
                        ) : (
                            <View style={styles.videoPlaceholder}>
                                <Text style={styles.videoPlaceholderText}>
                                    Ожидание собеседника...
                                </Text>
                            </View>
                        )}

                        {/* Локальное видео (picture-in-picture) */}
                        {localStream && (
                            <RTCView
                                streamURL={localStream.toURL()}
                                style={styles.localVideo}
                                objectFit={'cover'}
                                mirror={true}
                            />
                        )}
                    </View>
                </View>
            )}

            {/* Сообщения */}
            {!isInCall && (
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
            )}

            {/* Поле ввода */}
            {!isInCall && (
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
            )}
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
    // Стили для видеозвонка
    videoCallContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1E2C3A',
    },
    videoHeaderText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    endCallButton: {
        backgroundColor: '#FF3B30',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallButtonText: {
        color: 'white',
        fontSize: 16,
    },
    videoGrid: {
        flex: 1,
        position: 'relative',
    },
    remoteVideo: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    localVideo: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 120,
        height: 160,
        backgroundColor: '#000',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#2F89FC',
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    videoPlaceholderText: {
        color: 'white',
        fontSize: 16,
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
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 8,
    },
    userContainer: {
        justifyContent: 'flex-end',
    },
    otherContainer: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '70%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        marginHorizontal: 4,
    },
    userBubble: {
        backgroundColor: '#2B5278',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#182533',
        borderBottomLeftRadius: 4,
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
        marginHorizontal: 4,
    },
    userAvatar: {
        backgroundColor: '#2B5278',
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