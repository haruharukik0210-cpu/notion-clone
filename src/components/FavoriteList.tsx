import { FiFile } from "react-icons/fi";
import type { Note } from "../modules/notes/note.entity";
import Item from "./SideBar/Item";

// サイドバーのお気に入りゾーン（見た目だけを担当。表示するノートは親が絞り込んで渡す）
interface Props {
	notes: Note[];
	onItemSelect: (noteId: number) => void;
}

export default function FavoriteList({ notes, onItemSelect }: Props) {
	return (
		<section className="favorite-list" aria-label="お気に入り">
			<p className="favorite-list-heading">お気に入り</p>
			{notes.map((note) => (
				<Item
					key={note.id}
					label={note.title || "無題"}
					icon={FiFile}
					onClick={() => onItemSelect(note.id)}
				/>
			))}
		</section>
	);
}
