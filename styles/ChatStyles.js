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
    }
};