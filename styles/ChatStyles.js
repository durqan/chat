import { Platform } from 'react-native';

export const ChatStyles = {
    // Основной контейнер
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },

    // Header стили
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        paddingBottom: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8F5E8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3
    },
    headerInfo: {
        flex: 1
    },
    headerTitle: {
        color: '#2E7D32',
        fontSize: 18,
        fontWeight: 'bold'
    },
    connectionStatus: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500'
    },
    connectionDetails: {
        color: '#666',
        fontSize: 10,
        marginTop: 2
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerButton: {
        marginRight: 15,
        padding: 5
    },
    headerButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32'
    },

    // Стили сообщений
    userMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 12
    },
    otherMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 12
    },
    userBubble: {
        backgroundColor: '#2E7D32',
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomRightRadius: 6,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    otherBubble: {
        backgroundColor: '#F5F5F5',
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    messageText: {
        color: 'white',
        fontSize: 16,
        lineHeight: 20
    },
    otherMessageText: {
        color: '#333',
        fontSize: 16,
        lineHeight: 20
    },
    otherUserName: {
        color: '#2E7D32',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4
    },
    timestamp: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'right'
    },
    otherTimestamp: {
        color: '#888',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'right'
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2E7D32',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2
    },
    otherAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2
    },
    avatarText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold'
    },

    // Стили поля ввода
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8F5E8'
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 16,
        marginHorizontal: 8,
        color: '#333'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },

    // Стили для пустого состояния
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    emptyTitle: {
        color: '#2E7D32',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20
    },
    retryButton: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    // Стили для комнат
    roomListContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
    },
    roomListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E8F5E8',
    },
    roomListTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    createRoomButton: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    createRoomButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    roomList: {
        flex: 1,
    },
    roomListContent: {
        paddingVertical: 16,
    },
    roomItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E8F5E8',
    },
    roomItemActive: {
        backgroundColor: '#E8F5E8',
        borderColor: '#2E7D32',
    },
    roomInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    roomDetails: {
        fontSize: 12,
        color: '#666',
    },
    roomJoinButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2E7D32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomJoinButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyRooms: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyRoomsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },

// Модальное окно создания комнаты
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        margin: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 6,
    },
    modalButtonCancel: {
        backgroundColor: '#666',
    },
    modalButtonConfirm: {
        backgroundColor: '#2E7D32',
    },
    modalButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
};