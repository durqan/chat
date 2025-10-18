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
        const { onSend, isConnected } = this.props;

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
        const { isConnected } = this.props;

        return (
            <View style={ChatStyles.inputContainer}>
                <TextInput
                    style={[
                        ChatStyles.textInput,
                        {
                            borderColor: isConnected ? '#2E7D32' : '#CCC',
                            color: isConnected ? '#333' : '#999',
                        }
                    ]}
                    value={inputText}
                    onChangeText={this.handleTextChange}
                    placeholder={isConnected ? "Введите сообщение..." : "Ожидание подключения..."}
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    onSubmitEditing={this.handleSend}
                    returnKeyType="send"
                    editable={isConnected}
                />
                <TouchableOpacity
                    style={[
                        ChatStyles.sendButton,
                        { backgroundColor: isConnected ? '#2E7D32' : '#CCC' }
                    ]}
                    onPress={this.handleSend}
                    disabled={!isConnected}
                >
                    <Text style={ChatStyles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>
        );
    }
}