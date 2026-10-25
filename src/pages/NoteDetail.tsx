import { useEffect, useState } from "react";
import TitleInput from "../components/TitleInput";
import "../styles/pages/note-detail.css";
import { useNavigate, useParams } from "react-router-dom";
import { useNoteStore } from "../modules/notes/notes.state";
import { noteRepository } from "../modules/notes/note.repository";
import { Editor } from "../components/editor";
import { useDebouncedCallback } from "use-debounce";
import ArchivedBanner from "../components/ArchivedBanner";

export default function NoteDetail() {
	const params = useParams();
	const id = parseInt(params.id!);
	const [isLoading, setIsLoading] = useState(false);
	const noteStore = useNoteStore();
	const note = noteStore.getOne(id);
	const navigate = useNavigate();

	const fetchOne = async () => {
		setIsLoading(true);
		try {
			const note = await noteRepository.findOne(id);
			noteStore.set([note]);
		} catch (error) {
			// 見つからない場合などは、下の「note is not existed」が表示される
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchOne();
	}, [id]);

	const updateNote = async (
		id: number,
		note: { title?: string; content?: string },
	) => {
		try {
			const updatedNote = await noteRepository.update(id, note);
			noteStore.set([updatedNote]);
		} catch (error) {
			// 自動保存は入力のたびに呼ばれるので、アラートは出さずにログだけ残す
			console.error(error);
		}
	};

	// ゴミ箱から復元する（返ってきたノートは isArchived: false なので、バナーが自動で消える）
	const restoreNote = async (noteId: number) => {
		try {
			const restoredNote = await noteRepository.restore(noteId);
			noteStore.set([restoredNote]);
		} catch (error) {
			console.error(error);
			alert("ノートの復元に失敗しました。");
		}
	};

	// 完全に削除する（取り消せないので確認を出す）
	const deleteNote = async (noteId: number) => {
		if (!confirm("このノートを完全に削除しますか？元に戻せません。")) return;
		try {
			await noteRepository.delete(noteId);
			noteStore.delete(noteId);
			navigate("/");
		} catch (error) {
			console.error(error);
			alert("ノートの削除に失敗しました。");
		}
	};

	const debounced = useDebouncedCallback(updateNote, 500);

	if (isLoading) return <div />;
	if (!note) return <div>note is not existed</div>;

	return (
		<>
			{note.isArchived && (
				<ArchivedBanner
					onRestore={() => restoreNote(note.id)}
					onDelete={() => deleteNote(note.id)}
				/>
			)}
			<div className="note-detail-container">
				<div className="note-detail-content">
					<TitleInput
						initialData={note}
						onTitleChange={(title) => debounced(note.id, { title })}
						readOnly={note.isArchived}
					/>
					<Editor
						initialContent={note.content}
						onChange={(content) => debounced(note.id, { content })}
						readOnly={note.isArchived}
					/>
				</div>
			</div>
		</>
	);
}
