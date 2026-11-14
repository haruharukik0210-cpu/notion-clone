import { atom } from "jotai";
import type { Note } from "./note.entity";
import { useAtom } from "jotai";
import { useCallback } from "react";
import { mergeNotes } from "./notes.utils";

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
