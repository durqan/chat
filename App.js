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

import { SERVER_URL } from '@env';

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
        this.setupSocketListeners();
        this.connectToServer();
    }

    componentWillUnmount() {
        this.socketService.disconnect();
    }

    connectToServer = () => {
        const serverUrl = this.getServerUrl();
        this.socketService.initialize([serverUrl]);
    }

    getServerUrl = () => {
        return SERVER_URL;
    }

    setupSocketListeners() {
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
        if (this.pendingMessageId && message.userId === this.state.socketId) {
            this.setState(prevState => ({
                messages: prevState.messages.map(msg =>
                    msg.id === this.pendingMessageId ? message : msg
                )
            }), () => {
                this.pendingMessageId = null;
            });
        } else if (message.roomId === this.state.currentRoom?.id) {
            this.setState(prevState => ({
                messages: [...prevState.messages, message]
            }), this.scrollToBottom);
        }
    }

    handleConnectionChange(isConnected, status) {
        const connectionInfo = this.socketService.getConnectionInfo();
        this.setState({
            isConnected,
            socketId: connectionInfo.socketId,
            connectionStatus: status,
            serverUrl: connectionInfo.currentUrl
        });
    }

    handleHistoryReceived(data) {
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const roomId = data?.roomId || null;

        this.setState({
            messages: messages,
            currentRoom: roomId ? { id: roomId } : null
        }, this.scrollToBottom);
    }

    handleChatCleared() {
        this.setState({ messages: [] });
    }

    handleRoomList(data) {
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
        // Можно добавить уведомление если нужно
    }

    handleUserLeft(data) {
        // Можно добавить уведомление если нужно
    }

    handleRoomCreated(data) {
        this.setState(prevState => ({
            rooms: [...prevState.rooms, data.room]
        }));
    }

    handleSendMessage = (text) => {
        if (!text.trim()) return;

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

        // Сохраняем ID временного сообщения
        this.pendingMessageId = tempId;

        // Немедленно добавляем сообщение в UI
        this.setState(prevState => ({
            messages: [...prevState.messages, tempMessage]
        }), this.scrollToBottom);

        // Отправляем сообщение на сервер
        const success = this.socketService.sendMessage(text);
        if (!success) {
            // Удаляем временное сообщение если отправка не удалась
            this.setState(prevState => ({
                messages: prevState.messages.filter(msg => msg.id !== tempMessage.id)
            }));
            this.pendingMessageId = null;
            Alert.alert('Ошибка', 'Нет подключения к серверу');
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

        this.socketService.leaveRoom(this.state.currentRoom.id);
        this.setState({
            currentRoom: null,
            messages: [],
            roomUsers: [],
            showRoomList: true
        });
    };

    handleCreateRoom = (roomId, roomName) => {
        this.socketService.createRoom(roomId, roomName);
    };

    handleShowRoomList = () => {
        this.setState({ showRoomList: true });
    };

    handleRetryConnection = () => {
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
        setTimeout(() => {
            this.flatListRef.current?.scrollToEnd({ animated: true });
        }, 10);
    }

    renderMessage = ({ item }) => {
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