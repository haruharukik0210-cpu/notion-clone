import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "../ui/dropdown-menu";
import {
	FiChevronDown,
	FiChevronRight,
	FiFile,
	FiMoreHorizontal,
	FiPlus,
	FiStar,
	FiTrash2,
} from "react-icons/fi";
import Item from "../SideBar/Item";
import { Note } from "./../../modules/notes/note.entity";
import { useState } from "react";
import type { IconType } from "react-icons";

interface Props {
	note: Note;
	onCreate?: () => void;
	onExpand?: () => void;
	layer?: number;
	expanded?: boolean;
	onClick?: () => void;
	onDelete: () => void;
	onFavorite: () => void;
}

export default function NoteItem({
	note,
	onCreate,
	onExpand,
	layer = 0,
	expanded = false,
	onClick,
	onDelete,
	onFavorite,
}: Props) {
	const [isHovered, setIsHovered] = useState(false);

	const getIcon = (): IconType => {
		return expanded ? FiChevronDown : isHovered ? FiChevronRight : FiFile;
	};

	// メニュー（「…」・＋・ドロップダウンの項目）のクリックを、行の onClick（詳細へ移動）に伝えない
	const menu = (
		<div
			className="note-item-menu-container"
			onClick={(e) => e.stopPropagation()}
		>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<div className="note-item-menu-button" role="button">
						<FiMoreHorizontal className="note-item-menu-icon" size={16} />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="note-item-dropdown"
					align="start"
					side="right"
					forceMount
				>
					{/* お気に入りのときは出さない（外すのはノート詳細の星から） */}
					{!note.isFavorite && (
						<DropdownMenuItem onClick={onFavorite}>
							<FiStar className="note-item-delete-icon" size={16} />
							お気に入りに追加
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={onDelete}>
						<FiTrash2 className="note-item-delete-icon" size={16} />
						ゴミ箱へ
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<div className="note-item-menu-button" role="button" onClick={onCreate}>
				<FiPlus className="note-item-menu-icon" size={16} />
			</div>
		</div>
	);

	return (
		<div
			role="button"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{ paddingLeft: `${layer * 12 + 12}px` }}
			onClick={onClick}
		>
			<Item
				icon={getIcon()}
				label={note.title ?? "無題"}
				trailingItem={menu}
				onIconClick={(e) => {
					// ▶ で子ノートを開くときは、詳細へ移動しない
					e.stopPropagation();
					onExpand?.();
				}}
			/>
		</div>
	);
}
