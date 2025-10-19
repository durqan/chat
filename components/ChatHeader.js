import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class ChatHeader extends React.Component {
    render() {
        const {
            connectionInfo,
            onRetry,
            onClear,
            onChangeServer,
            currentRoom,
            onLeaveRoom,
            onShowRoomList,
            roomUsers = []
        } = this.props;

        const { isConnected, status, socketId, currentUrl } = connectionInfo;

        const displayUrl = currentUrl ?
            currentUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '') :
            'Не подключен';

        return (
            <View style={ChatStyles.header}>
                <View style={ChatStyles.headerInfo}>
                    <Text style={ChatStyles.headerTitle}>
                        {currentRoom ? `🏠 ${currentRoom.name}` : '🌐 Чат приложение'}
                    </Text>

                    <Text style={[
                        ChatStyles.connectionStatus,
                        { color: isConnected ? '#2E7D32' : '#D32F2F' }
                    ]}>
                        {status}
                        {currentRoom && ` • ${currentRoom.userCount || 0} пользователей`}
                    </Text>

                    <Text style={ChatStyles.connectionDetails}>
                        {socketId ? `ID: ${socketId.substring(0, 8)}... • ${displayUrl}` : displayUrl}
                    </Text>
                </View>

                <View style={ChatStyles.headerActions}>
                    {currentRoom ? (
                        <>
                            <TouchableOpacity onPress={onShowRoomList} style={ChatStyles.headerButton}>
                                <Text style={[ChatStyles.headerButtonText, { color: '#2E7D32' }]}>🏠</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onLeaveRoom} style={ChatStyles.headerButton}>
                                <Text style={[ChatStyles.headerButtonText, { color: '#FF9800' }]}>🚪</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClear} style={ChatStyles.headerButton}>
                                <Text style={[ChatStyles.headerButtonText, { color: '#D32F2F' }]}>🗑️</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={onChangeServer} style={ChatStyles.headerButton}>
                                <Text style={[ChatStyles.headerButtonText, { color: '#2E7D32' }]}>🌍</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onRetry} style={ChatStyles.headerButton}>
                                <Text style={[ChatStyles.headerButtonText, { color: '#2E7D32' }]}>⟳</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    }
}