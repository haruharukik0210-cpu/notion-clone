import { atom } from "jotai";
import type { Note } from "./note.entity";
import { useAtom } from "jotai";

const noteAtom = atom<Note[]>([]);

export const useNoteStore = () => {
	const [notes, setNotes] = useAtom(noteAtom);
	const getAll = () => notes;
	const getOne = (id: number) => {
		return notes.find((note) => note.id === id);
	}
	const set = (newNotes: Note[]) => {
		setNotes((oldNotes) => {
			const combineNotes = [...oldNotes, ...newNotes];
			const uniqueNotes: { [key: number]: Note } = {};
			for (const note of combineNotes) {
				uniqueNotes[note.id] = note;
			}
			return Object.values(uniqueNotes);
		});
	};

	const deleteNote = (id: number) => {
		const findChildrenIds = (parentId: number): number[] => {
			const childrenIds = notes.filter((note) => note.parentId === parentId).map(note => note.id);
			return childrenIds.concat(
				...childrenIds.map((childId) => findChildrenIds(childId)),
			);
		};
		const childrenIds = findChildrenIds(id);
		setNotes(oldNotes => oldNotes.filter(note => !childrenIds.includes(note.id) && note.id !== id));
	}

	const clear = () => {
		setNotes([]);
	}
	return { getAll,getOne, set, delete: deleteNote, clear };
};
