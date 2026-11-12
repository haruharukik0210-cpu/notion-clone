import { useEffect, useState } from "react";
import TitleInput from "../components/TitleInput";
import "../styles/pages/note-detail.css";
import { useNavigate, useParams } from "react-router-dom";
import { useNoteStore } from "../modules/notes/notes.state";
import { noteRepository } from "../modules/notes/note.repository";
import { Editor } from "../components/editor";
import { useDebouncedCallback } from "use-debounce";
import ArchivedBanner from "../components/ArchivedBanner";
import FavoriteButton from "../components/FavoriteButton";
import NoteIconHeader from "../components/NoteIconHeader";
import IconPicker from "../components/IconPicker";

export default function NoteDetail() {
	const params = useParams();
	const id = parseInt(params.id!);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const noteStore = useNoteStore();
	// set だけを取り出す（noteStore 自体は毎回新しくなるが、set は useCallback で変わらない）
	const { set: setNoteStore } = noteStore;
	const note = noteStore.getOne(id);
	const navigate = useNavigate();

	
	useEffect(() => {
		const fetchOne = async () => {
			setIsLoading(true);
			try {
				const note = await noteRepository.findOne(id);
				setNoteStore([note]);
			} catch (error) {
				// 見つからない場合などは、下の「note is not existed」が表示される
				console.error(error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchOne();
	}, [id, setNoteStore]);

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

	const toggleFavorite = async (noteId: number, isFavorite: boolean) => {
		try {
			const updatedNote = !isFavorite
				? await noteRepository.favorite(noteId)
				: await noteRepository.unfavorite(noteId);
			noteStore.set([updatedNote]);
		} catch (error) {
			console.error(error);
			alert(!isFavorite
				? "ノートのお気に入り登録に失敗しました。"
				: "ノートのお気に入り解除に失敗しました。"
			);
		}
	};

	const updateIcon = async (noteId: number, icon: string | null) => {
		try {
			const updatedNote = await noteRepository.update(noteId, { icon });
			noteStore.set([updatedNote]);
			setIsOpen(false);
		} catch (error) {
			console.error(error);
			alert("ノートのアイコン更新に失敗しました。");
		}
	}

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
					{/* タイトルのまわり：ここにマウスを乗せると「アイコンを追加」が出る */}
					<div className="note-detail-header">
						<div className="note-detail-actions">
							{!note.isArchived && (
								<FavoriteButton isFavorite={note.isFavorite} onToggle={() => toggleFavorite(note.id, note.isFavorite)} />
							)}
						</div>
						{/* アイコンのエリア：NoteIconHeader と IconPicker を並べて置く（IconPicker はアイコンの下に開く） */}
						<div className="note-icon-area">
							<NoteIconHeader icon={note.icon} readOnly={note.isArchived} onOpen={() => setIsOpen(true)} />
							<IconPicker icon={note.icon} isOpen={isOpen} onUpdate={(emojiData) => updateIcon(note.id, emojiData.emoji)} onClose={() => setIsOpen(false)} />
						</div>
						<TitleInput
							initialData={note}
							onTitleChange={(title) => debounced(note.id, { title })}
							readOnly={note.isArchived}
						/>
					</div>
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
