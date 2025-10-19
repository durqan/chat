export class Message {
    constructor(id, text, userId, userName, timestamp) {
        this.id = id || Date.now().toString();
        this.text = text || '';
        this.userId = userId || 'unknown';
        this.userName = userName || 'Аноним';
        this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now());
        this.roomId = null;
    }

    static fromJSON(json) {
        if (!json) {
            return new Message();
        }

        try {
            const message = new Message(
                json.id,
                json.text,
                json.userId,
                json.userName,
                new Date(json.timestamp)
            );
            message.roomId = json.roomId || null;
            return message;
        } catch (error) {
            console.error('Error creating Message from JSON:', error, json);
            return new Message(
                Date.now().toString(),
                json.text || 'Ошибка загрузки сообщения',
                'error',
                'Система',
                new Date()
            );
        }
    }

    formatTime() {
        return this.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}