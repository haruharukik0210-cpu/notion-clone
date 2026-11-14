import SideBar from "./components/SideBar";
import SearchModal from "./components/SearchModal";
import "./styles/layout.css";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "./modules/auth/current-user.state";
import { useEffect, useState } from "react";
import { useNoteStore } from "./modules/notes/notes.state";
import { noteRepository } from "./modules/notes/note.repository";
import { getNotePath } from "./modules/notes/notes.utils";
import type { Note } from "./modules/notes/note.entity";
import TrashModal from "./components/TrashModal";

export default function Layout() {
	const currentUser = useAtomValue(currentUserAtom);
	const [isLoading, setIsLoading] = useState(true);
	const noteStore = useNoteStore();
	// set だけを取り出す（noteStore 自体は毎回新しくなるが、set は useCallback で変わらない）
	const { set: setNoteStore } = noteStore;
	const [isShowModal, setIsShowModal] = useState(false);
	const [searchResult, setSearchResult] = useState<Note[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [notes, setNotes] = useState<Note[]>([]);
	const navigate = useNavigate();

	
	
	useEffect(() => {
		const fetchNotes = async () => {
			setIsLoading(true);
			try {
				const notes = await noteRepository.find();
				const favoriteNotes = await noteRepository.findFavorites();
				setNoteStore(notes);
				setNoteStore(favoriteNotes);
			} catch (error) {
				console.error(error);
				alert("ノートの読み込みに失敗しました。");
			} finally {
				// 成功しても失敗しても、読み込み中の表示は終わらせる
				setIsLoading(false);
			}
		};
		fetchNotes();
	}, [setNoteStore]);

	const searchNotes = async (keyword: string) => {
		try {
			const notes = await noteRepository.find({ keyword });
			noteStore.set(notes);
			setSearchResult(notes);
		} catch (error) {
			console.error(error);
			alert("検索に失敗しました。");
		}
	};

	const moveToDetail = (noteId: number) => {
		navigate(`/notes/${noteId}`);
		setIsShowModal(false);
	};

	const onItemSelect = (noteId: number) => {
		navigate(`/notes/${noteId}`);
		setIsOpen(false);
	};

	const fetchTrash = async () => {
		const archivedNotes = await noteRepository.findTrash();
		setNotes(archivedNotes);
	};

	const onTrashClick = async () => {
		try {
			await fetchTrash();
			setIsOpen(true);
		} catch (error) {
			console.error(error);
			alert("ゴミ箱の読み込みに失敗しました。");
		}
	};

	const onDelete = async (noteId: number) => {
		if (!confirm("このノートを完全に削除しますか？元に戻せません。")) return;
		try {
			await noteRepository.delete(noteId);
			noteStore.delete(noteId);
			await fetchTrash();
		} catch (error) {
			console.error(error);
			alert("ノートの削除に失敗しました。");
		}
	};

	const onRestore = async (noteId: number) => {
		try {
			const restoredNote = await noteRepository.restore(noteId);
			noteStore.set([restoredNote]);
			await fetchTrash();
		} catch (error) {
			console.error(error);
			alert("ノートの復元に失敗しました。");
		}
	};

	const getPath = (note: Note): string => {
		// 親は「ゴミ箱の一覧」か「サイドバーのストア」のどちらかにいるので、まとめてから渡す
		const allNotes = [...notes, ...noteStore.getAll()];
		return getNotePath(allNotes, note);
	};

	if (!currentUser) return <Navigate to="/signin" replace />;

	return (
		<div className="layout-container">
			{!isLoading && (
				<SideBar
					onSearchClick={() => setIsShowModal(true)}
					onTrashClick={onTrashClick}
				/>
			)}
			<main className="layout-main">
				<Outlet />
			</main>
			<SearchModal
				isOpen={isShowModal}
				onClose={() => setIsShowModal(false)}
				notes={searchResult}
				onKeywordChange={searchNotes}
				onItemSelect={moveToDetail}
			/>
			<TrashModal
				onClose={() => setIsOpen(false)}
				isOpen={isOpen}
				notes={notes}
				onDelete={onDelete}
				onItemSelect={onItemSelect}
				onRestore={onRestore}
				getPath={getPath}
			/>
		</div>
	);
}
