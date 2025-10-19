import React from 'react';
import { View, Text } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class MessageBubble extends React.Component {
    isMyMessage = (message, currentUserId) => {
        if (!currentUserId || !message.userId) return false;
        return message.userId === currentUserId ||
            message.userId.includes(currentUserId) ||
            currentUserId.includes(message.userId);
    }

    formatTime = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '--:--';
        }
    }

    render() {
        const { message, currentUserId } = this.props;
        const isUser = this.isMyMessage(message, currentUserId);
        const isTemp = message.id && message.id.startsWith('temp-');

        console.log('💬 Rendering MessageBubble:', {
            id: message.id,
            text: message.text,
            isUser,
            isTemp,
            currentUserId
        });

        if (isUser) {
            return (
                <View style={ChatStyles.userMessageContainer}>
                    <View style={[
                        ChatStyles.userBubble,
                        isTemp && {
                            opacity: 0.7,
                            backgroundColor: '#45a049' // Более светлый зеленый для временных
                        }
                    ]}>
                        <Text style={ChatStyles.messageText}>{message.text}</Text>
                        <Text style={[
                            ChatStyles.timestamp,
                            isTemp && { fontStyle: 'italic' }
                        ]}>
                            {isTemp ? '🕐 Отправка...' : this.formatTime(message.timestamp)}
                        </Text>
                    </View>
                    <View style={ChatStyles.userAvatar}>
                        <Text style={ChatStyles.avatarText}>
                            {isTemp ? '⏳' : 'Я'}
                        </Text>
                    </View>
                </View>
            );
        } else {
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