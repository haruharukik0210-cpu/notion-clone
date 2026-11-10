import EmojiPicker from "emoji-picker-react";

// 絵文字の日本語データ（モーダルを開いたときに読み込む）
const loadJapaneseEmojis = () => import("emoji-picker-react/data/emojis-ja");

type Props = {
	icon: string | null;
	isOpen: boolean;
	onUpdate: (emojiData: { emoji: string | null }) => void;
	onClose: () => void;
};
// 絵文字を選ぶモーダル（デザインだけ）
// 置き場所は NoteDetail の .note-icon-area の中（NoteIconHeader のすぐ後ろ。アイコンの下に開く）
export default function IconPicker({ icon, isOpen, onUpdate, onClose }: Props) {
	return (
		<>
			{/* 外側：画面全体を覆う透明な層。ここをクリックしたら閉じる */}
			{isOpen && (<div className="icon-picker-overlay" onClick={onClose} />)}
			{isOpen && (
				<div className="icon-picker" role="dialog" aria-label="アイコンを選ぶ">
					<div className="icon-picker-header">
						<span className="icon-picker-tab">絵文字</span>
						{icon && (
							<button
								type="button"
								className="icon-picker-remove"
								onClick={() => onUpdate({ emoji: null })}
							>
								削除
							</button>
						)}
					</div>

					{/* 絵文字をクリックしたときの処理は onEmojiClick で受け取る（emojiData.emoji が "📝" などの文字列） */}
					<EmojiPicker
						className="icon-picker-emoji"
						colorScheme="light"
						emojiData={loadJapaneseEmojis}
						onEmojiClick={(emojiData) => onUpdate(emojiData)}
						labels={{
							searchPlaceholder: "絵文字を検索",
							searchLabel: "絵文字を検索",
							searchResultsNone: "見つかりませんでした",
							loading: "読み込み中…",
						}}
						skinTonesDisabled
						previewConfig={{ showPreview: false }}
						width="100%"
						height={360}
						lazyLoadEmojis
					/>
				</div>
			)}
		</>
	);
}
