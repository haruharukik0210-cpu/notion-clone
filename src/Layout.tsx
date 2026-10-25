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
		const notes = await noteRepository.find();
		noteStore.set(notes);
		setIsLoading(false);
		console.log("取得したノート:", notes);
	};

	const searchNotes = async (keyword: string) => {
		const notes = await noteRepository.find({ keyword });
		noteStore.set(notes);
		setSearchResult(notes);
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
	}

	const onTrashClick = async () => {
		await fetchTrash();
		setIsOpen(true);
	};

	const onDelete = async (noteId: number) => {
		await noteRepository.delete(noteId);
		noteStore.delete(noteId);
		await fetchTrash();
	};

	const onRestore = async (noteId: number) => {
		const restoredNote = await noteRepository.restore(noteId);
		noteStore.set([restoredNote]);
		await fetchTrash();
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
			/>
		</div>
	);
}
