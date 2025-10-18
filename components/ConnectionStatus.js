import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class ConnectionStatus extends React.Component {
    render() {
        const { isConnected, onRetry } = this.props;

        return (
            <View style={ChatStyles.emptyContainer}>
                <Text style={ChatStyles.emptyTitle}>
                    {isConnected ? 'Сообщений пока нет' : 'Нет подключения к серверу'}
                </Text>
                <Text style={ChatStyles.emptySubtitle}>
                    {isConnected ? 'Отправьте первое сообщение!' : 'Проверьте настройки сети и сервер'}
                </Text>
                {!isConnected && (
                    <TouchableOpacity
                        onPress={onRetry}
                        style={ChatStyles.retryButton}
                    >
                        <Text style={ChatStyles.retryButtonText}>
                            Повторить подключение
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }
}