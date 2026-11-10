import { FiFile } from "react-icons/fi";

type Props = {
	icon: string | null;
};
// アイコン表示（デザインだけ）
// 絵文字があれば絵文字、なければ 📄（FiFile）を出す。大きさは置かれた場所の CSS で変える
export default function NoteIcon({icon}: Props) {
	return (
		<span className="note-icon">
			{icon ? (
				<span className="note-icon-emoji" role="img" aria-label="アイコン">
					{icon}
				</span>
			) : (
				<FiFile className="note-icon-fallback" aria-hidden="true" />
			)}
		</span>
	);
}
