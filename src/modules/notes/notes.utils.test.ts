import { describe, it, expect } from "vitest";
import { mergeNotes, findChildrenIds } from "./notes.utils";
import type { Note } from "./note.entity";

const createNote = (id: number, title: string, parentId: number | null = null): Note => ({
	id,
	title,
	parentId,
	userId: "test-user",
	content: null,
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

describe("findChildrenIds", () => {
	it("子がいないとき", () => {
		expect(findChildrenIds([createNote(1, "Note 1")], 1)).toEqual([]);
	});
	it("子だけいるとき", () => {
		expect(findChildrenIds([createNote(1, "Note 1"), createNote(2, "Note 2", 1)], 1)).toEqual([2]);
	});
	it("孫・ひ孫までいるとき", () => {
		expect(findChildrenIds([createNote(1, "Note 1"), createNote(2, "Note 2", 1), createNote(3, "Note 3", 2)], 1)).toEqual([2, 3]);
	});
	it("関係ないノートが混ざっているとき", () => {
		expect(findChildrenIds([createNote(1, "Note 1"), createNote(2, "Note 2")], 1)).toEqual([]);
	});
});