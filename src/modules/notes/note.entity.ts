export class Note {
    id!: number;
    userId!: string;
    title?: string | null;
    content?: string | null
    parentId?: number | null;
    createdAt!: Date;
    isArchived!: boolean;

    constructor(data: Note) {
        Object.assign(this, data);
        this.createdAt = new Date(data.createdAt);
    }
}