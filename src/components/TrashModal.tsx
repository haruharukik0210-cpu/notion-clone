import { FiFile, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import type { Note } from "../modules/notes/note.entity";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

// ゴミ箱モーダル（見た目だけを担当。データと処理は親から受け取る）
interface Props {
	isOpen: boolean;
	onClose: () => void;
	notes: Note[];
	onRestore: (noteId: number) => void;
	onDelete: (noteId: number) => void;
	onItemSelect: (noteId: number) => void;
	// ノートの階層（例：「旅行の計画 / 持ち物リスト」）を返す関数。空文字なら表示しない
	getPath?: (note: Note) => string;
}

export default function TrashModal({
	isOpen,
	onClose,
	notes,
	onRestore,
	onDelete,
	onItemSelect,
	getPath,
}: Props) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="trash-modal">
				<DialogHeader>
					<DialogTitle>ゴミ箱</DialogTitle>
					<DialogDescription>復元するか、完全に削除できます</DialogDescription>
				</DialogHeader>

				{notes.length === 0 ? (
					<p className="trash-modal-empty">ゴミ箱は空です</p>
				) : (
					<ul className="trash-modal-list">
						{notes.map((note) => {
							const path = getPath?.(note);
							return (
								<li key={note.id} className="trash-modal-item">
									<button
										type="button"
										className="trash-modal-item-title"
										onClick={() => onItemSelect(note.id)}
									>
										<FiFile size={18} />
										<span className="trash-modal-item-text">
											<span className="trash-modal-item-name">{note.title || "無題"}</span>
											{path && <span className="trash-modal-item-path">{path}</span>}
										</span>
									</button>
									<div className="trash-modal-item-actions">
										<button
											type="button"
											className="trash-modal-action"
											title="復元"
											aria-label="復元"
											onClick={() => onRestore(note.id)}
										>
											<FiRotateCcw size={16} />
										</button>
										<button
											type="button"
											className="trash-modal-action trash-modal-action-danger"
											title="完全に削除"
											aria-label="完全に削除"
											onClick={() => onDelete(note.id)}
										>
											<FiTrash2 size={16} />
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}
