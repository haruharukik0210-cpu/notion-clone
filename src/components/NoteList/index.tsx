import { useState } from "react";
import type { Note } from "../../modules/notes/note.entity";
import { noteRepository } from "../../modules/notes/note.repository";
import { useNoteStore } from "../../modules/notes/notes.state";
import NoteItem from "./NoteItem";
import { useNavigate } from "react-router-dom";

interface Props {
	layer?: number;
	parentId?: number;
}

export default function NoteList({ layer = 0, parentId }: Props) {
	const noteStore = useNoteStore();
	const notes = noteStore.getAll();
	const [expanded, setExpanded] = useState<Map<number, boolean>>(new Map());

	const navigate = useNavigate();

	const createChild = async (e: React.MouseEvent<Element>, parentId: number) => {
		e.preventDefault();
		const newNote = await noteRepository.create({ parentId });
		noteStore.set([newNote]);
		setExpanded((prev) => {
			const newExpanded = new Map(prev);
			newExpanded.set(parentId, true);
			return newExpanded;
		});
		moveToDetail(newNote.id);
	};

	const fetchChildren = async (e: React.MouseEvent<Element>, note: Note) => {
		e.preventDefault();
		const children = await noteRepository.find({ parentId: note.id });
		noteStore.set(children);
		setExpanded((prev) => {
			const newExpanded = new Map(prev);
			newExpanded.set(note.id, !newExpanded.get(note.id));
			return newExpanded;
		});
	};

	const deleteNote = async (e:React.MouseEvent<Element>, noteId: number) => {
		try {
			e.preventDefault();
			await noteRepository.archive(noteId);
			noteStore.delete(noteId);
			navigate("/")
		} catch(error) {
			console.error(error);
		}
	}

	const moveToDetail = (noteId: number) => {
		navigate(`/notes/${noteId}`);
	};

	return (
		<>
			{notes
				.filter((note) => (note.parentId ?? undefined) === (parentId ?? undefined))
				.map((note) => (
					<div key={note.id}>
						<NoteItem
							note={note}
							onCreate={(e) => createChild(e, note.id)}
							onExpand={(e) => fetchChildren(e, note)}
							layer={layer}
							expanded={expanded.get(note.id)}
							onClick={() => moveToDetail(note.id)}
							onDelete={(e) => deleteNote(e,note.id)}
						/>
						{expanded.get(note.id) && (
							<NoteList layer={layer + 1} parentId={note.id} />
						)}
					</div>
				))}
		</>
	);
}
