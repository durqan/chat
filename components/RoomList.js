import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    TextInput,
    Modal
} from 'react-native';
import { ChatStyles } from '../styles/ChatStyles';

export class RoomList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showCreateForm: false,
            newRoomId: '',
            newRoomName: ''
        };
    }

    componentDidMount() {
        console.log('RoomList mounted with rooms:', this.props.rooms);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.rooms !== this.props.rooms) {
            console.log('RoomList updated with rooms:', this.props.rooms);
        }
    }

    handleCreateRoom = () => {
        const { newRoomId, newRoomName } = this.state;

        if (!newRoomId.trim()) {
            Alert.alert('Ошибка', 'Введите ID комнаты');
            return;
        }

        if (newRoomId.length < 2 || newRoomId.length > 20) {
            Alert.alert('Ошибка', 'ID комнаты должен быть от 2 до 20 символов');
            return;
        }

        // Проверяем, что ID содержит только английские буквы, цифры и дефисы
        if (!/^[a-zA-Z0-9-]+$/.test(newRoomId)) {
            Alert.alert('Ошибка', 'ID комнаты может содержать только английские буквы, цифры и дефисы');
            return;
        }

        this.props.onCreateRoom(newRoomId.trim(), newRoomName.trim() || newRoomId.trim());

        this.setState({
            showCreateForm: false,
            newRoomId: '',
            newRoomName: ''
        });
    };

    renderRoomItem = ({ item }) => {
        console.log('Rendering room item:', item);
        return (
            <TouchableOpacity
                style={[
                    ChatStyles.roomItem,
                    item.id === this.props.currentRoom?.id && ChatStyles.roomItemActive
                ]}
                onPress={() => this.props.onJoinRoom(item)}
                disabled={!this.props.isConnected}
            >
                <View style={ChatStyles.roomInfo}>
                    <Text style={ChatStyles.roomName}>{item.name}</Text>
                    <Text style={ChatStyles.roomDetails}>
                        {item.userCount || 0} пользователей • {item.messageCount || 0} сообщений
                    </Text>
                </View>
                <View style={ChatStyles.roomJoinButton}>
                    <Text style={ChatStyles.roomJoinButtonText}>
                        {item.id === this.props.currentRoom?.id ? '✓' : '→'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    render() {
        const { rooms, isConnected } = this.props;
        const { showCreateForm, newRoomId, newRoomName } = this.state;

        console.log('RoomList render with rooms:', rooms);

        return (
            <View style={ChatStyles.roomListContainer}>
                <View style={ChatStyles.roomListHeader}>
                    <Text style={ChatStyles.roomListTitle}>Выберите комнату</Text>
                    <TouchableOpacity
                        style={ChatStyles.createRoomButton}
                        onPress={() => this.setState({ showCreateForm: true })}
                        disabled={!isConnected}
                    >
                        <Text style={ChatStyles.createRoomButtonText}>+ Создать</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={rooms}
                    renderItem={this.renderRoomItem}
                    keyExtractor={(item) => item.id}
                    style={ChatStyles.roomList}
                    contentContainerStyle={ChatStyles.roomListContent}
                    ListEmptyComponent={
                        <View style={ChatStyles.emptyRooms}>
                            <Text style={ChatStyles.emptyRoomsText}>
                                {isConnected ? 'Нет доступных комнат' : 'Нет подключения к серверу'}
                            </Text>
                            {isConnected && (
                                <Text style={[ChatStyles.emptyRoomsText, { marginTop: 8 }]}>
                                    Создайте первую комнату!
                                </Text>
                            )}
                        </View>
                    }
                />

                <Modal
                    visible={showCreateForm}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => this.setState({ showCreateForm: false })}
                >
                    <View style={ChatStyles.modalOverlay}>
                        <View style={ChatStyles.modalContent}>
                            <Text style={ChatStyles.modalTitle}>Создать комнату</Text>

                            <TextInput
                                style={ChatStyles.modalInput}
                                placeholder="ID комнаты (английские буквы, цифры)"
                                placeholderTextColor="#999"
                                value={newRoomId}
                                onChangeText={(text) => this.setState({ newRoomId: text })}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={20}
                            />

                            <TextInput
                                style={ChatStyles.modalInput}
                                placeholder="Название комнаты (необязательно)"
                                placeholderTextColor="#999"
                                value={newRoomName}
                                onChangeText={(text) => this.setState({ newRoomName: text })}
                                maxLength={30}
                            />

                            <View style={ChatStyles.modalButtons}>
                                <TouchableOpacity
                                    style={[ChatStyles.modalButton, ChatStyles.modalButtonCancel]}
                                    onPress={() => this.setState({ showCreateForm: false })}
                                >
                                    <Text style={ChatStyles.modalButtonText}>Отмена</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[ChatStyles.modalButton, ChatStyles.modalButtonConfirm]}
                                    onPress={this.handleCreateRoom}
                                >
                                    <Text style={ChatStyles.modalButtonText}>Создать</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
}