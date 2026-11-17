export class User {
    id!: string;
    email!: string;
    name!: string;
    isGuest!: boolean;

    constructor(data: User) {
        Object.assign(this, data);
    }
}