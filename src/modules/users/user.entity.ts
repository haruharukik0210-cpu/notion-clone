export class User {
    id!: string;
    email!: string;
    name!: string;

    constructor(data: User) {
        Object.assign(this, data);
    }
}