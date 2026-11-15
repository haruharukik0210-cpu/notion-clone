import type { ComponentProps, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdDragIndicator } from "react-icons/md";
import NoteItem from "./NoteItem";

type Props = Omit<ComponentProps<typeof NoteItem>, "dragHandle"> & {
	// 開いているときの子ノートの一覧。行と一緒に動くように、同じ箱の中に入れる
	children?: ReactNode;
};

// ノートの行を「つかんで並び替えられる」ようにする箱
export default function SortableNoteItem({ children, ...itemProps }: Props) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: itemProps.note.id });

	// 横には動かさず、縦だけ動かす
	const style = {
		transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
		transition,
	};

	// つまみ（⋮⋮）。ここだけドラッグできる
	const dragHandle = (
		<span
			ref={setActivatorNodeRef}
			className={`note-drag-handle ${isDragging ? "is-dragging" : ""}`}
			style={{ left: `${(itemProps.layer ?? 0) * 12}px` }}
			aria-label="ドラッグして並び替え"
			// つまみのクリックを、行の onClick（詳細へ移動）に伝えない
			onClick={(e) => e.stopPropagation()}
			{...attributes}
			{...listeners}
		>
			<MdDragIndicator size={14} />
		</span>
	);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`sortable-note ${isDragging ? "is-dragging" : ""}`}
		>
			<NoteItem {...itemProps} dragHandle={dragHandle} />
			{children}
		</div>
	);
}
