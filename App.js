import React from 'react';
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';

import { SocketService } from './services/SocketService';
import { Message } from './models/Message';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { MessageInput } from './components/MessageInput';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RoomList } from './components/RoomList';
import { ChatStyles } from './styles/ChatStyles';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            messages: [],
            rooms: [],
            currentRoom: null,
            roomUsers: [],
            isConnected: false,
            socketId: null,
            connectionStatus: 'Поиск сервера...',
            serverUrl: '',
            showRoomList: true
        };

        this.socketService = new SocketService();
        this.flatListRef = React.createRef();
        this.pendingMessageId = null;
    }

    componentDidMount() {
        console.log('🔧 App mounted');
        this.setupSocketListeners();
        this.connectToServer();
    }

    componentWillUnmount() {
        this.socketService.disconnect();
    }

    connectToServer = () => {
        const serverUrl = this.getServerUrl();
        console.log('🔌 Connecting to:', serverUrl);
        this.socketService.initialize([serverUrl]);
    }

    getServerUrl = () => {
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:3000';
        } else if (Platform.OS === 'ios') {
            return 'http://192.168.0.128:3000';
        } else {
            return 'http://192.168.0.128:3000';
        }
    }

    setupSocketListeners() {
        console.log('🎧 Setting up socket listeners');
        this.socketService.onMessage(this.handleNewMessage.bind(this));
        this.socketService.onConnectionChange(this.handleConnectionChange.bind(this));
        this.socketService.onHistoryReceived(this.handleHistoryReceived.bind(this));
        this.socketService.onChatCleared(this.handleChatCleared.bind(this));
        this.socketService.onRoomList(this.handleRoomList.bind(this));
        this.socketService.onRoomUsers(this.handleRoomUsers.bind(this));
        this.socketService.onUserJoined(this.handleUserJoined.bind(this));
        this.socketService.onUserLeft(this.handleUserLeft.bind(this));
        this.socketService.onRoomCreated(this.handleRoomCreated.bind(this));
    }

    handleNewMessage(message) {
        console.log('📨 Server message received:', {
            id: message.id,
            text: message.text,
            roomId: message.roomId,
            userId: message.userId,
            isPending: this.pendingMessageId
        });

        // Если это наше оптимистичное сообщение, заменяем его на серверное
        if (this.pendingMessageId && message.userId === this.state.socketId) {
            console.log('🔄 Replacing temporary message with server message');
            this.setState(prevState => ({
                messages: prevState.messages.map(msg =>
                    msg.id === this.pendingMessageId ? message : msg
                )
            }), () => {
                console.log('✅ Temporary message replaced');
                this.pendingMessageId = null;
            });
        }
        // Иначе просто добавляем новое сообщение
        else if (message.roomId === this.state.currentRoom?.id) {
            console.log('➕ Adding new message from other user');
            this.setState(prevState => ({
                messages: [...prevState.messages, message]
            }), this.scrollToBottom);
        } else {
            console.log('❌ Message ignored - wrong room or unknown');
        }
    }

    handleConnectionChange(isConnected, status) {
        console.log('🔌 Connection:', isConnected ? 'Connected' : 'Disconnected', status);
        const connectionInfo = this.socketService.getConnectionInfo();

        this.setState({
            isConnected,
            socketId: connectionInfo.socketId,
            connectionStatus: status,
            serverUrl: connectionInfo.currentUrl
        });
    }

    handleHistoryReceived(data) {
        console.log('📚 History received:', data.messages?.length || 0, 'messages');
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const roomId = data?.roomId || null;

        this.setState({
            messages: messages,
            currentRoom: roomId ? { id: roomId } : null
        }, this.scrollToBottom);
    }

    handleChatCleared() {
        console.log('🗑️ Chat cleared');
        this.setState({ messages: [] });
    }

    handleRoomList(data) {
        console.log('🏠 Room list received:', data.rooms?.length || 0, 'rooms');
        const rooms = Array.isArray(data?.rooms) ? data.rooms : [];

        this.setState({
            rooms: rooms,
            showRoomList: !this.state.currentRoom
        });
    }

    handleRoomUsers(data) {
        if (data.roomId === this.state.currentRoom?.id) {
            this.setState({
                roomUsers: Array.isArray(data.users) ? data.users : [],
                currentRoom: {
                    ...this.state.currentRoom,
                    userCount: data.userCount || 0
                }
            });
        }
    }

    handleUserJoined(data) {
        console.log('👤 User joined:', data.user.name);
    }

    handleUserLeft(data) {
        console.log('👤 User left:', data.user.name);
    }

    handleRoomCreated(data) {
        console.log('🏠 Room created:', data.room.name);
        this.setState(prevState => ({
            rooms: [...prevState.rooms, data.room]
        }));
    }

    // Обработчики действий
    handleSendMessage = (text) => {
        if (!text.trim()) {
            console.log('❌ Empty message, skipping');
            return;
        }

        console.log('📤 SENDING MESSAGE:', text);
        console.log('📊 Current state:', {
            socketId: this.state.socketId,
            currentRoom: this.state.currentRoom,
            isConnected: this.state.isConnected,
            currentMessages: this.state.messages.length
        });

        // Создаем временное сообщение для мгновенного отображения
        const tempId = `temp-${Date.now()}`;
        const tempMessage = new Message(
            tempId,
            text.trim(),
            this.state.socketId,
            'Вы',
            new Date()
        );
        tempMessage.roomId = this.state.currentRoom?.id;

        console.log('🆕 Temporary message created:', {
            id: tempMessage.id,
            text: tempMessage.text,
            roomId: tempMessage.roomId
        });

        // Сохраняем ID временного сообщения
        this.pendingMessageId = tempId;
        console.log('📝 Pending message ID set:', this.pendingMessageId);

        // Немедленно добавляем сообщение в UI
        console.log('🎨 Adding temporary message to UI...');
        this.setState(prevState => {
            const newMessages = [...prevState.messages, tempMessage];
            console.log('📈 Messages after adding temp:', newMessages.length);
            return { messages: newMessages };
        }, () => {
            console.log('✅ Temporary message added to state');
            console.log('📊 Current messages:', this.state.messages.map(m => ({id: m.id, text: m.text})));
            this.scrollToBottom();
        });

        // Отправляем сообщение на сервер
        console.log('🚀 Sending to server...');
        const success = this.socketService.sendMessage(text);
        if (!success) {
            console.log('❌ Failed to send to server');
            // Удаляем временное сообщение если отправка не удалась
            this.setState(prevState => ({
                messages: prevState.messages.filter(msg => msg.id !== tempMessage.id)
            }));
            this.pendingMessageId = null;
            Alert.alert('Ошибка', 'Нет подключения к серверу');
        } else {
            console.log('✅ Message sent to server successfully');
        }
    };

    handleClearChat = () => {
        if (!this.state.currentRoom) return;

        Alert.alert(
            'Очистить историю',
            'Вы уверены, что хотите удалить все сообщения в этой комнате?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Очистить',
                    onPress: () => this.socketService.clearChat(),
                },
            ]
        );
    };

    handleJoinRoom = (room) => {
        console.log('🚪 Joining room:', room.name);
        const success = this.socketService.joinRoom(room.id);
        if (success) {
            this.setState({
                currentRoom: room,
                messages: [],
                showRoomList: false
            });
        }
    };

    handleLeaveRoom = () => {
        if (!this.state.currentRoom) return;

        console.log('🚪 Leaving room:', this.state.currentRoom.name);
        this.socketService.leaveRoom(this.state.currentRoom.id);
        this.setState({
            currentRoom: null,
            messages: [],
            roomUsers: [],
            showRoomList: true
        });
    };

    handleCreateRoom = (roomId, roomName) => {
        console.log('🏠 Creating room:', roomId);
        this.socketService.createRoom(roomId, roomName);
    };

    handleShowRoomList = () => {
        this.setState({ showRoomList: true });
    };

    handleRetryConnection = () => {
        console.log('🔄 Retrying connection');
        this.socketService.retryConnection();
    };

    handleChangeServer = () => {
        Alert.prompt(
            'Изменить сервер',
            'Введите URL сервера:',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Подключиться',
                    onPress: (url) => {
                        if (url && url.trim()) {
                            this.setState({
                                messages: [],
                                rooms: [],
                                currentRoom: null,
                                roomUsers: [],
                                isConnected: false,
                                socketId: null,
                                connectionStatus: 'Подключение...',
                                showRoomList: true
                            }, () => {
                                this.socketService.disconnect();
                                setTimeout(() => {
                                    this.socketService.initialize([url.trim()]);
                                }, 500);
                            });
                        }
                    },
                },
            ],
            'plain-text',
            this.state.serverUrl
        );
    };

    scrollToBottom = () => {
        console.log('⬇️ Scrolling to bottom');
        setTimeout(() => {
            if (this.flatListRef.current) {
                this.flatListRef.current.scrollToEnd({ animated: true });
                console.log('✅ Scrolled to bottom');
            } else {
                console.log('❌ FlatList ref not available');
            }
        }, 10);
    }

    renderMessage = ({ item }) => {
        console.log('🎨 Rendering message:', {id: item.id, text: item.text});
        return (
            <MessageBubble
                message={item}
                currentUserId={this.state.socketId}
            />
        );
    };

    getConnectionInfo() {
        return {
            isConnected: this.state.isConnected,
            status: this.state.connectionStatus,
            currentUrl: this.state.serverUrl,
            socketId: this.state.socketId,
            currentRoom: this.state.currentRoom
        };
    }

    renderContent() {
        const {
            messages,
            isConnected,
            currentRoom,
            rooms,
            showRoomList
        } = this.state;

        console.log('🎨 Rendering content:', {
            showRoomList,
            messagesCount: messages.length,
            currentRoom: currentRoom?.name,
            isConnected
        });

        if (showRoomList) {
            return (
                <RoomList
                    rooms={rooms}
                    currentRoom={currentRoom}
                    onJoinRoom={this.handleJoinRoom}
                    onCreateRoom={this.handleCreateRoom}
                    isConnected={isConnected}
                />
            );
        }

        return (
            <>
                <FlatList
                    ref={this.flatListRef}
                    data={messages}
                    renderItem={this.renderMessage}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    onContentSizeChange={this.scrollToBottom}
                    onLayout={this.scrollToBottom}
                    ListEmptyComponent={
                        <ConnectionStatus
                            isConnected={isConnected}
                            currentRoom={currentRoom}
                            onRetry={this.handleRetryConnection}
                            onChangeServer={this.handleChangeServer}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={false}
                />

                <MessageInput
                    isConnected={isConnected}
                    onSend={this.handleSendMessage}
                    currentRoom={currentRoom}
                />
            </>
        );
    }

    render() {
        console.log('🎨 App render');
        return (
            <KeyboardAvoidingView
                style={ChatStyles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ChatHeader
                    connectionInfo={this.getConnectionInfo()}
                    onRetry={this.handleRetryConnection}
                    onClear={this.handleClearChat}
                    onChangeServer={this.handleChangeServer}
                    currentRoom={this.state.currentRoom}
                    onLeaveRoom={this.handleLeaveRoom}
                    onShowRoomList={this.handleShowRoomList}
                    roomUsers={this.state.roomUsers}
                />

                {this.renderContent()}
            </KeyboardAvoidingView>
        );
    }
}

export default App;