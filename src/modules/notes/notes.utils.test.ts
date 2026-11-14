import { describe, it, expect } from "vitest";
import { findChildrenIds, getNotePath, mergeNotes } from "./notes.utils";
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

describe("getNotePath", () => {
	it("親がいないときは、空の文字列", () => {
		const note = createNote(1, "Note 1");
		expect(getNotePath([note], note)).toBe("");
	});

	it("親が1つなら、親のタイトルだけ", () => {
		const parent = createNote(1, "親");
		const note = createNote(2, "子", 1);
		expect(getNotePath([parent, note], note)).toBe("親");
	});

	it("祖父・親の順に「 / 」でつながる", () => {
		const grandparent = createNote(1, "祖父");
		const parent = createNote(2, "親", 1);
		const note = createNote(3, "子", 2);
		expect(getNotePath([grandparent, parent, note], note)).toBe("祖父 / 親");
	});

	it("親が一覧にいなければ、そこで止まる", () => {
		// 祖父（id:1）が一覧にいない
		const parent = createNote(2, "親", 1);
		const note = createNote(3, "子", 2);
		expect(getNotePath([parent, note], note)).toBe("親");
	});

	it("タイトルがない親は「無題」になる", () => {
		const parent = createNote(1, "");
		const note = createNote(2, "子", 1);
		expect(getNotePath([parent, note], note)).toBe("無題");
	});
});
