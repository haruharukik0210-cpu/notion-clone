import { useState } from "react";
import type { Note } from "../../modules/notes/note.entity";
import { noteRepository } from "../../modules/notes/note.repository";
import { useNoteStore } from "../../modules/notes/notes.state";
import SortableNoteItem from "./SortableNoteItem";
import { useNavigate } from "react-router-dom";
import { reorderNotes } from "../../modules/notes/notes.utils";
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Props {
	layer?: number;
	parentId?: number;
}

export default function NoteList({ layer = 0, parentId }: Props) {
	const noteStore = useNoteStore();
	const notes = noteStore.getAll();
	const [expanded, setExpanded] = useState<Map<number, boolean>>(new Map());

	const navigate = useNavigate();

	// ドラッグの始め方：マウスは 5px 動かしたらドラッグ開始（ちょっと触っただけでは始まらない）。
	// キーボードは、つまみにフォーカスして Space → 矢印キー → Space でも並び替えられる
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const createChild = async (parentId: number) => {
		try {
			const newNote = await noteRepository.create({ parentId });
			noteStore.set([newNote]);
			setExpanded((prev) => {
				const newExpanded = new Map(prev);
				newExpanded.set(parentId, true);
				return newExpanded;
			});
			moveToDetail(newNote.id);
		} catch (error) {
			console.error(error);
			alert("ノートの作成に失敗しました。");
		}
	};

	const fetchChildren = async (note: Note) => {
		try {
			const children = await noteRepository.find({ parentId: note.id });
			noteStore.set(children);
			setExpanded((prev) => {
				const newExpanded = new Map(prev);
				newExpanded.set(note.id, !newExpanded.get(note.id));
				return newExpanded;
			});
		} catch (error) {
			console.error(error);
			alert("子ノートの読み込みに失敗しました。");
		}
	};

	const deleteNote = async (noteId: number) => {
		try {
			await noteRepository.archive(noteId);
			noteStore.delete(noteId);
			navigate("/");
		} catch (error) {
			console.error(error);
			alert("ゴミ箱への移動に失敗しました。");
		}
	};

	const favoriteNote = async (noteId: number) => {
		try {
			const favoriteNote = await noteRepository.favorite(noteId);
			noteStore.set([favoriteNote]);
		} catch (error) {
			console.error(error);
			alert("お気に入りの追加に失敗しました");
		}
	};

	const moveToDetail = (noteId: number) => {
		navigate(`/notes/${noteId}`);
	};

	// この階層に表示するノート（ゴミ箱に入っていない・親が parentId のもの）
	const visibleNotes = notes
		.filter(
			(note) =>
				!note.isArchived &&
				(note.parentId ?? undefined) === (parentId ?? undefined),
		)
		.sort((a, b) => a.position - b.position);

	// 今は「何を、どこに落としたか」を console に出すだけ
	const handleDragEnd = async (event: DragEndEvent) => {
		const activeId = Number(event.active.id);
		const overId = Number(event.over?.id);
		if (!overId || activeId === overId) return;
		const preOrderedNotes = [...visibleNotes];
		try {
			const newOrderedNotes = reorderNotes(preOrderedNotes, activeId, overId);
			noteStore.set(newOrderedNotes);
			await noteRepository.reorder(newOrderedNotes.map(note => note.id));
		} catch (error) {
			noteStore.set(preOrderedNotes);
			console.error(error);
			alert("ノートの並び替えに失敗しました。");
		}
	};

	// 階層ごとに DndContext を分けているので、ドラッグできるのは同じ階層（同じ親）の中だけになる
	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={visibleNotes.map((note) => note.id)}
				strategy={verticalListSortingStrategy}
			>
				{visibleNotes.map((note) => (
					<SortableNoteItem
						key={note.id}
						note={note}
						onCreate={() => createChild(note.id)}
						onExpand={() => fetchChildren(note)}
						layer={layer}
						expanded={expanded.get(note.id)}
						onClick={() => moveToDetail(note.id)}
						onDelete={() => deleteNote(note.id)}
						onFavorite={() => favoriteNote(note.id)}
					>
						{expanded.get(note.id) && (
							<NoteList layer={layer + 1} parentId={note.id} />
						)}
					</SortableNoteItem>
				))}
			</SortableContext>
		</DndContext>
	);
}
