import type { Note } from "./note.entity";

export const mergeNotes = (oldNotes: Note[], newNotes: Note[]): Note[] => {
	const combineNotes = [...oldNotes, ...newNotes];
	const uniqueNotes: { [key: number]: Note } = {};
	for (const note of combineNotes) {
		uniqueNotes[note.id] = note;
	}
	return Object.values(uniqueNotes);
};
