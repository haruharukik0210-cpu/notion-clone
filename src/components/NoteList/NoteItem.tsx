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
	FiTrash2,
} from "react-icons/fi";
import Item from "../SideBar/Item";
import { Note } from "./../../modules/notes/note.entity";
import { useState } from "react";
import type { IconType } from "react-icons";

interface Props {
	note: Note;
	onCreate?: (event: React.MouseEvent<Element>) => void;
	onExpand?: (event: React.MouseEvent<Element>) => void;
	layer?: number;
	expanded?: boolean;
	onClick?: () => void;
	onDelete: (event: React.MouseEvent<Element>) => void;
}

export default function NoteItem({
	note,
	onCreate,
	onExpand,
	layer = 0,
	expanded = false,
	onClick,
	onDelete,
}: Props) {
	const [isHovered, setIsHovered] = useState(false);

	const getIcon = (): IconType => {
		return expanded ? FiChevronDown : isHovered ? FiChevronRight : FiFile;
	};

	const menu = (
		<div className="note-item-menu-container">
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
					<DropdownMenuItem onClick={onDelete}>
						<FiTrash2 className="note-item-delete-icon" size={16} />
						Delete
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
				onIconClick={onExpand}
			/>
		</div>
	);
}
