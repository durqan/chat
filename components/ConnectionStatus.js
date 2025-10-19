import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class ConnectionStatus extends React.Component {
    render() {
        const { isConnected, currentRoom, onRetry, onChangeServer } = this.props;

        return (
            <View style={ChatStyles.emptyContainer}>
                <Text style={ChatStyles.emptyTitle}>
                    {isConnected
                        ? (currentRoom ? 'Сообщений пока нет' : 'Выберите комнату для начала общения')
                        : 'Нет подключения к серверу'
                    }
                </Text>
                <Text style={ChatStyles.emptySubtitle}>
                    {isConnected
                        ? (currentRoom ? 'Отправьте первое сообщение!' : 'Присоединитесь к существующей или создайте новую')
                        : 'Проверьте настройки сети и сервер'
                    }
                </Text>
                {!isConnected && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={onRetry}
                            style={[ChatStyles.retryButton, { flex: 1 }]}
                        >
                            <Text style={ChatStyles.retryButtonText}>
                                Повторить
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onChangeServer}
                            style={[ChatStyles.retryButton, {
                                flex: 1,
                                backgroundColor: '#666'
                            }]}
                        >
                            <Text style={ChatStyles.retryButtonText}>
                                Сменить сервер
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }
}