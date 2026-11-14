import { atom } from "jotai";
import type { Note } from "./note.entity";
import { useAtom } from "jotai";
import { useCallback } from "react";
import { mergeNotes } from "./notes.utils";
import { findChildrenIds } from "./notes.utils";

const noteAtom = atom<Note[]>([]);

export const useNoteStore = () => {
	const [notes, setNotes] = useAtom(noteAtom);
	const getAll = () => notes;
	const getOne = (id: number) => {
		return notes.find((note) => note.id === id);
	}
	
	const set = useCallback(
		(newNotes: Note[]) => {
			setNotes((oldNotes) => {
				return mergeNotes(oldNotes, newNotes);
			});
		},
		[setNotes],
	);

	const deleteNote = (id: number) => {
		const childrenIds = findChildrenIds(notes, id);
		setNotes(oldNotes => oldNotes.filter(note => !childrenIds.includes(note.id) && note.id !== id));
	}

	const clear = () => {
		setNotes([]);
	}
	return { getAll,getOne, set, delete: deleteNote, clear };
};
