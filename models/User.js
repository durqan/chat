export class User {
    constructor(socketId, name = null) {
        this.socketId = socketId;
        this.name = name;
    }

    getDisplayName() {
        return this.name || 'Аноним';
    }

    getInitial() {
        return this.getDisplayName().charAt(0).toUpperCase();
    }
}