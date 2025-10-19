import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class MessageInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inputText: ''
        };
    }

    handleSend = () => {
        const { inputText } = this.state;
        const { onSend, isConnected, currentRoom } = this.props;

        if (!currentRoom) {
            Alert.alert('Ошибка', 'Выберите комнату для отправки сообщений');
            return;
        }

        if (inputText.trim() && isConnected) {
            onSend(inputText.trim());
            this.setState({ inputText: '' });
        }
    };

    handleTextChange = (text) => {
        this.setState({ inputText: text });
    };

    render() {
        const { inputText } = this.state;
        const { isConnected, currentRoom } = this.props;

        const placeholder = !currentRoom
            ? "Выберите комнату для чата..."
            : isConnected
                ? `Введите сообщение в ${currentRoom.name}...`
                : "Ожидание подключения...";

        return (
            <View style={ChatStyles.inputContainer}>
                <TextInput
                    style={[
                        ChatStyles.textInput,
                        {
                            borderColor: isConnected && currentRoom ? '#2E7D32' : '#CCC',
                            color: isConnected && currentRoom ? '#333' : '#999',
                        }
                    ]}
                    value={inputText}
                    onChangeText={this.handleTextChange}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    onSubmitEditing={this.handleSend}
                    returnKeyType="send"
                    editable={isConnected && !!currentRoom}
                />
                <TouchableOpacity
                    style={[
                        ChatStyles.sendButton,
                        {
                            backgroundColor: isConnected && currentRoom ? '#2E7D32' : '#CCC'
                        }
                    ]}
                    onPress={this.handleSend}
                    disabled={!isConnected || !currentRoom}
                >
                    <Text style={ChatStyles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>
        );
    }
}