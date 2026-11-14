import type { Note } from "./note.entity";

export const mergeNotes = (oldNotes: Note[], newNotes: Note[]): Note[] => {
	const combineNotes = [...oldNotes, ...newNotes];
	const uniqueNotes: { [key: number]: Note } = {};
	for (const note of combineNotes) {
		uniqueNotes[note.id] = note;
	}
	return Object.values(uniqueNotes);
};

export const findChildrenIds = (notes: Note[], parentId: number): number[] => {
	const childrenIds = notes
		.filter((note) => note.parentId === parentId)
		.map((note) => note.id);
	return childrenIds.concat(
		...childrenIds.map((childId) => findChildrenIds(notes, childId)),
	);
};
