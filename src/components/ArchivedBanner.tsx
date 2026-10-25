import { FiRotateCcw, FiTrash2 } from "react-icons/fi";

// ゴミ箱のノートを開いたときに上部に出す帯（見た目だけを担当。どのノートかは親が知っている）
interface Props {
	onRestore: () => void;
	onDelete: () => void;
}

export default function ArchivedBanner({ onRestore, onDelete }: Props) {
	return (
		<div className="archived-banner" role="status">
			<p className="archived-banner-message">
				<FiTrash2 size={16} />
				このノートはゴミ箱にあります
			</p>
			<div className="archived-banner-actions">
				<button
					type="button"
					className="archived-banner-button"
					onClick={onRestore}
				>
					<FiRotateCcw size={14} />
					復元
				</button>
				<button
					type="button"
					className="archived-banner-button archived-banner-button-danger"
					onClick={onDelete}
				>
					完全に削除
				</button>
			</div>
		</div>
	);
}
