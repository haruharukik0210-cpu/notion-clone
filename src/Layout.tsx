import SideBar from "./components/SideBar";
import SearchModal from "./components/SearchModal";
import "./styles/layout.css";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "./modules/auth/current-user.state";
import { useEffect, useState } from "react";
import { useNoteStore } from "./modules/notes/notes.state";
import { noteRepository } from "./modules/notes/note.repository";
import type { Note } from "./modules/notes/note.entity";
import TrashModal from "./components/TrashModal";

export default function Layout() {
	const currentUser = useAtomValue(currentUserAtom);
	const [isLoading, setIsLoading] = useState(true);
	const noteStore = useNoteStore();
	const [isShowModal, setIsShowModal] = useState(false);
	const [searchResult, setSearchResult] = useState<Note[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [notes, setNotes] = useState<Note[]>([]);
	const navigate = useNavigate();

	useEffect(() => {
		fetchNotes();
	}, []);
	const fetchNotes = async () => {
		setIsLoading(true);
		try {
			const notes = await noteRepository.find();
			noteStore.set(notes);
		} catch (error) {
			console.error(error);
			alert("ノートの読み込みに失敗しました。");
		} finally {
			// 成功しても失敗しても、読み込み中の表示は終わらせる
			setIsLoading(false);
		}
	};

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

	// ノートの親 → 親の親…とさかのぼり、「旅行の計画 / 持ち物リスト」の形で返す
	const getPath = (note: Note): string => {
		// 親は「ゴミ箱の一覧」か「サイドバーのストア」のどちらかにいる
		const allNotes = [...notes, ...noteStore.getAll()];
		let current = note;
		const titles: string[] = [];

		// 親がいる間、繰り返す
		while (current.parentId != null) {
			const parent = allNotes.find((n) => n.id === current.parentId);
			if (!parent) break; // 親が読み込まれていなければ、そこで終わり
			titles.unshift(parent.title || "無題"); // 先頭に追加 → 上の階層が先頭に来る
			current = parent; // 次は親の親を探す
		}

		return titles.join(" / ");
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
