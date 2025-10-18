import React from 'react';
import { View, Text } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class MessageBubble extends React.Component {
    isMyMessage = (message, currentUserId) => {
        if (!currentUserId || !message.userId) {
            console.log('Missing IDs - currentUserId:', currentUserId, 'message.userId:', message.userId);
            return false;
        }

        console.log('Comparing - currentUserId:', currentUserId, 'message.userId:', message.userId);

        // Прямое сравнение
        if (message.userId === currentUserId) {
            console.log('Exact match - my message');
            return true;
        }

        // Частичное сравнение (если ID обрезаны или в разном формате)
        if (message.userId.includes(currentUserId) || currentUserId.includes(message.userId)) {
            console.log('Partial match - my message');
            return true;
        }

        console.log('No match - other user message');
        return false;
    }

    formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    render() {
        const { message, currentUserId } = this.props;
        const isUser = this.isMyMessage(message, currentUserId);

        console.log('RENDER - isUser:', isUser, 'currentUserId:', currentUserId, 'messageUserId:', message.userId);

        if (isUser) {
            // МОИ сообщения - СПРАВА (зеленые)
            return (
                <View style={ChatStyles.userMessageContainer}>
                    <View style={ChatStyles.userBubble}>
                        <Text style={ChatStyles.messageText}>{message.text}</Text>
                        <Text style={ChatStyles.timestamp}>
                            {this.formatTime(message.timestamp)}
                        </Text>
                    </View>
                    <View style={ChatStyles.userAvatar}>
                        <Text style={ChatStyles.avatarText}>Я</Text>
                    </View>
                </View>
            );
        } else {
            // ЧУЖИЕ сообщения - СЛЕВА (серые)
            return (
                <View style={ChatStyles.otherMessageContainer}>
                    <View style={ChatStyles.otherAvatar}>
                        <Text style={ChatStyles.avatarText}>
                            {message.userName ? message.userName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <View style={ChatStyles.otherBubble}>
                        <Text style={ChatStyles.otherUserName}>
                            {message.userName || 'Аноним'}
                        </Text>
                        <Text style={ChatStyles.otherMessageText}>{message.text}</Text>
                        <Text style={ChatStyles.otherTimestamp}>
                            {this.formatTime(message.timestamp)}
                        </Text>
                    </View>
                </View>
            );
        }
    }
}