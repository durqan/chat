export class Message {
    constructor(id, text, userId, userName, timestamp) {
        this.id = id;
        this.text = text;
        this.userId = userId;
        this.userName = userName;
        this.timestamp = timestamp;
    }

    static fromJSON(json) {
        return new Message(
            json.id,
            json.text,
            json.userId,
            json.userName,
            new Date(json.timestamp)
        );
    }
}