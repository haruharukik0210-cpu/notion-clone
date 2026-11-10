import type { Note } from "../modules/notes/note.entity";
import Item from "./SideBar/Item";
import NoteIcon from "./NoteIcon";

// サイドバーのお気に入りゾーン（見た目だけを担当。表示するノートは親が絞り込んで渡す）
interface Props {
	notes: Note[];
	onItemSelect: (noteId: number) => void;
}

export default function FavoriteList({ notes, onItemSelect }: Props) {
	return (
		<section className="favorite-list" aria-label="お気に入り">
			<p className="sidebar-section-heading">お気に入り</p>
			{notes.map((note) => (
				// NoteItem と同じく外側に余白をつけて、通常のノートと左端をそろえる
				<div key={note.id} className="favorite-list-item">
					<Item
						label={note.title || "無題"}
						onClick={() => onItemSelect(note.id)}
						leadingItem={<NoteIcon icon={note.icon} />}
					/>
				</div>
			))}
		</section>
	);
}