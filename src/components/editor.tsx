import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { ja } from "@blocknote/core/locales";

interface Props {
	initialContent?: string | null;
	onChange: (value: string) => void;
}

export function Editor({ initialContent, onChange }: Props) {
	const editor = useCreateBlockNote({
		dictionary: ja,
		initialContent: initialContent ? JSON.parse(initialContent) : undefined,
	});

	return (
		<div>
			<BlockNoteView
				editor={editor}
				onChange={() => onChange(JSON.stringify(editor.document))}
			/>
		</div>
	);
}
