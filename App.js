import React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';

import { SocketService } from './services/SocketService';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { MessageInput } from './components/MessageInput';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ChatStyles } from './styles/ChatStyles';

// 🔧 НАСТРОЙТЕ ЭТИ АДРЕСА!
const EXTERNAL_IP = '77.222.52.61';
const INTERNAL_IP = '77.222.52.61';

const SERVER_URLS = [
    `http://${EXTERNAL_IP}:3000`,
    `http://${INTERNAL_IP}:3000`,
];

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            messages: [],
            isConnected: false,
            socketId: null,
            connectionStatus: 'Поиск сервера...'
        };

        this.socketService = new SocketService();
        this.flatListRef = React.createRef();
    }

    componentDidMount() {
        this.setupSocketListeners();
        this.socketService.initialize(SERVER_URLS);
    }

    componentWillUnmount() {
        this.socketService.disconnect();
    }

    setupSocketListeners() {
        this.socketService.onMessage(this.handleNewMessage.bind(this));
        this.socketService.onConnectionChange(this.handleConnectionChange.bind(this));
        this.socketService.onHistoryReceived(this.handleHistoryReceived.bind(this));
        this.socketService.onChatCleared(this.handleChatCleared.bind(this));
    }

    handleNewMessage(message) {
        console.log('=== NEW MESSAGE ===');
        console.log('Message userId:', message.userId);
        console.log('Current socketId:', this.state.socketId);
        console.log('Message text:', message.text);

        this.setState(prevState => ({
            messages: [...prevState.messages, message]
        }), () => {
            setTimeout(() => {
                this.flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
    }

    handleConnectionChange(isConnected, status) {
        const connectionInfo = this.socketService.getConnectionInfo();

        console.log('=== CONNECTION CHANGE ===');
        console.log('isConnected:', isConnected);
        console.log('socketId:', connectionInfo.socketId);
        console.log('status:', status);

        this.setState({
            isConnected,
            socketId: connectionInfo.socketId,
            connectionStatus: status
        });
    }

    handleHistoryReceived(messages) {
        console.log('=== MESSAGE HISTORY ===');
        console.log('Received', messages.length, 'messages');
        messages.forEach((msg, index) => {
            console.log(`Message ${index}: userId=${msg.userId}, text=${msg.text}`);
        });

        this.setState({ messages });
    }

    handleChatCleared() {
        this.setState({ messages: [] });
        Alert.alert('Чат очищен', 'Все сообщения были удалены');
    }

    handleSendMessage = (text) => {
        const success = this.socketService.sendMessage(text);
        if (!success) {
            Alert.alert('Ошибка', 'Нет подключения к серверу');
        }
    };

    handleClearChat = () => {
        Alert.alert(
            'Очистить историю',
            'Вы уверены, что хотите удалить все сообщения?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Очистить',
                    style: 'destructive',
                    onPress: () => {
                        this.socketService.clearChat();
                    },
                },
            ]
        );
    };

    handleRetryConnection = () => {
        this.socketService.retryConnection();
    };

    renderMessage = ({ item, index }) => {
        console.log(`Rendering message ${index}:`, {
            messageId: item.id,
            messageUserId: item.userId,
            currentSocketId: this.state.socketId,
            text: item.text
        });

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
            currentUrl: '',
            socketId: this.state.socketId
        };
    }

    render() {
        const { messages, isConnected } = this.state;

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
                />

                <FlatList
                    ref={this.flatListRef}
                    data={messages}
                    renderItem={this.renderMessage}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    onContentSizeChange={() => this.flatListRef.current?.scrollToEnd()}
                    ListEmptyComponent={
                        <ConnectionStatus
                            isConnected={isConnected}
                            onRetry={this.handleRetryConnection}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />

                <MessageInput
                    isConnected={isConnected}
                    onSend={this.handleSendMessage}
                />
            </KeyboardAvoidingView>
        );
    }
}

export default App;