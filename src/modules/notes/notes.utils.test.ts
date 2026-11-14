import { describe, it, expect } from "vitest";
import { mergeNotes } from "./notes.utils";
import type { Note } from "./note.entity";

const createNote = (id: number, title: string): Note => ({
	id,
	title,
	userId: "test-user",
	content: null,
	parentId: null,
	createdAt: new Date("2026-01-01"),
	isArchived: false,
	isFavorite: false,
	icon: null,
});

describe("mergeNotes", () => {
	it("空に足せるか", () => {
		expect(mergeNotes([], [createNote(1, "Note 1")])).toEqual([createNote(1, "Note 1")]);
	});
	it("同じ id は新しいほうで上書き", () => {
		expect(mergeNotes([createNote(1, "Note 1")], [createNote(1, "Note 2")])).toEqual([createNote(1, "Note 2")]);
	});
	it("同じ id 違う id は両方残る", () => {
		expect(mergeNotes([createNote(1, "Note 1")], [createNote(2, "Note 2")])).toEqual([
			createNote(1, "Note 1"),
			createNote(2, "Note 2"),
		]);
	});
	it("何も来なければ、そのまま", () => {
		expect(mergeNotes([createNote(1, "Note 1")], [])).toEqual([createNote(1, "Note 1")]);
	});
});
