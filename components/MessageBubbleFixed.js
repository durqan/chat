import React from 'react';
import { View, Text } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class MessageBubbleFixed extends React.Component {
    isMyMessage = (message, currentUserId) => {
        if (!currentUserId || !message.userId) return false;

        // Несколько способов проверки
        const exactMatch = message.userId === currentUserId;
        const partialMatch = message.userId.includes(currentUserId) ||
            currentUserId.includes(message.userId);

        return exactMatch || partialMatch;
    }

    render() {
        const { message, currentUserId } = this.props;
        const isUser = this.isMyMessage(message, currentUserId);

        console.log('Fixed component - isUser:', isUser, 'currentUserId:', currentUserId, 'messageUserId:', message.userId);

        if (isUser) {
            // МОИ сообщения - СПРАВА
            return (
                <View style={ChatStyles.userMessageContainer}>
                    <View style={ChatStyles.userBubble}>
                        <Text style={ChatStyles.messageText}>{message.text}</Text>
                        <Text style={ChatStyles.timestamp}>
                            {message.formatTime()}
                        </Text>
                    </View>
                    <View style={ChatStyles.userAvatar}>
                        <Text style={ChatStyles.avatarText}>Я</Text>
                    </View>
                </View>
            );
        } else {
            // ЧУЖИЕ сообщения - СЛЕВА
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
                            {message.formatTime()}
                        </Text>
                    </View>
                </View>
            );
        }
    }
}