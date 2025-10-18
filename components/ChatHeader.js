import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class ChatHeader extends React.Component {
    render() {
        const { connectionInfo, onRetry, onClear } = this.props;
        const { isConnected, status, socketId } = connectionInfo;

        return (
            <View style={ChatStyles.header}>
                <View style={ChatStyles.headerInfo}>
                    <Text style={ChatStyles.headerTitle}>🌐 Ubuntu Чат</Text>
                    <Text style={[
                        ChatStyles.connectionStatus,
                        { color: isConnected ? '#2E7D32' : '#D32F2F' }
                    ]}>
                        {status}
                    </Text>
                    <Text style={ChatStyles.connectionDetails}>
                        {socketId ? `ID: ${socketId.substring(0, 8)}...` : ''}
                    </Text>
                </View>
                <View style={ChatStyles.headerActions}>
                    <TouchableOpacity onPress={onRetry} style={ChatStyles.headerButton}>
                        <Text style={[ChatStyles.headerButtonText, { color: '#2E7D32' }]}>⟳</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClear} style={ChatStyles.headerButton}>
                        <Text style={[ChatStyles.headerButtonText, { color: '#D32F2F' }]}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}