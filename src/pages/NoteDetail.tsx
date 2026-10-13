import { useEffect, useState } from "react";
import TitleInput from "../components/TitleInput";
import "../styles/pages/note-detail.css";
import { useParams } from "react-router-dom";
import { useNoteStore } from "../modules/notes/notes.state";
import { noteRepository } from "../modules/notes/note.repository";
import { Editor } from "../components/editor";
import { useDebouncedCallback } from "use-debounce";

export default function NoteDetail() {
	const params = useParams();
	const id = parseInt(params.id!);
	const [isLoading, setIsLoading] = useState(false);
	const noteStore = useNoteStore();
	const note = noteStore.getOne(id);
	const fetchOne = async () => {
		setIsLoading(true);
		const note = await noteRepository.findOne(id);
		noteStore.set([note]);
		setIsLoading(false);
	};

	useEffect(() => {
		fetchOne();
	}, [id]);

	const updateNote = async (
		id: number,
		note: { title?: string; content?: string },
	) => {
		const updatedNote = await noteRepository.update(id, note);
		noteStore.set([updatedNote]);
		return updatedNote;
	};

  const debounced = useDebouncedCallback(updateNote, 500);

	if (isLoading) return <div />;
	if (!note) return <div>note is not existed</div>;

	return (
		<div className="note-detail-container">
			<div className="note-detail-content">
				<TitleInput
					initialData={note}
					onTitleChange={(title) => debounced(note.id, { title })}
				/>
				<Editor
					initialContent={note.content}
					onChange={(content) => debounced(note.id, { content })}
				/>
			</div>
		</div>
	);
}
