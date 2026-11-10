import { FiSmile } from "react-icons/fi";
import NoteIcon from "./NoteIcon";

type Props = {
	icon: string | null;
	readOnly: boolean;
	onOpen: () => void;
};
// ノート詳細のアイコン部分（デザインだけ）
// アイコンがないときは「アイコンを追加」ボタン、あるときは大きな絵文字（押すとモーダルを開く）
export default function NoteIconHeader({ icon, readOnly, onOpen }: Props) {
	return (
		<div className="note-icon-header">
			{icon ? (
				<button
					type="button"
					className="note-icon-button"
					aria-label="アイコンを変更"
					disabled={readOnly}
					onClick={onOpen}
				>
					<NoteIcon icon={icon} />
				</button>
			) : (
				!readOnly && (
					<button type="button" className="note-icon-add-button" onClick={onOpen}>
						<FiSmile size={16} aria-hidden="true" />
						アイコンを追加
					</button>
				)
			)}
		</div>
	);
}
