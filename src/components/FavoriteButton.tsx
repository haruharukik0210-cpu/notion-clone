import { FiStar } from "react-icons/fi";

// ノート詳細のお気に入りボタン（見た目だけを担当。追加か解除かは親が isFavorite を見て決める）
interface Props {
	isFavorite: boolean;
	onToggle: () => void;
}

export default function FavoriteButton({ isFavorite, onToggle }: Props) {
	const label = isFavorite ? "お気に入りから外す" : "お気に入りに追加";

	return (
		<button
			type="button"
			className={`favorite-button ${isFavorite ? "is-active" : ""}`}
			aria-pressed={isFavorite}
			aria-label={label}
			title={label}
			onClick={onToggle}
		>
			<FiStar size={20} />
		</button>
	);
}
