import api from "../../lib/api";
import { Note } from "./note.entity";

export const noteRepository = {
	async find(options?: {
		parentId?: number;
		keyword?: string;
	}): Promise<Note[]> {
		const result = await api.get("/notes", {
			params: {
				parentId: options?.parentId,
				keyword: options?.keyword,
			},
		});
		return result.data.notes.map((data: Note) => new Note(data));
	},
	async findFavorites(): Promise<Note[]> {
		const result = await api.get("/notes/favorites");
		return result.data.notes.map((data: Note) => new Note(data));
	},
	async findTrash(): Promise<Note[]> {
		const result = await api.get("/notes/trash");
		return result.data.notes.map((data: Note) => new Note(data));
	},
	async create(params: { title?: string; parentId?: number }): Promise<Note> {
		const result = await api.post("/notes", {
			title: params.title,
			parentId: params.parentId,
		});
		return new Note(result.data);
	},
	async findOne(id: number): Promise<Note> {
		const result = await api.get(`/notes/${id}`);
		return new Note(result.data);
	},
	async update(
		id: number,
		note: { title?: string; content?: string; icon?: string | null; },
	): Promise<Note> {
		const result = await api.patch(`/notes/${id}`, note);
		return new Note(result.data);
	},
	async favorite(id: number): Promise<Note> {
		const result = await api.patch(`/notes/${id}/favorite`);
		return new Note(result.data);
	},
	async unfavorite(id: number): Promise<Note> {
		const result = await api.patch(`/notes/${id}/unfavorite`);
		return new Note(result.data);
	},
	async restore(id: number): Promise<Note> {
		const result = await api.patch(`/notes/${id}/restore`);
		return new Note(result.data);
	},
	async archive(id: number): Promise<boolean> {
		await api.patch(`/notes/${id}/archive`);
		return true;
	},
	async delete(id: number): Promise<boolean> {
		await api.delete(`/notes/${id}`);
		return true;
	},
};
