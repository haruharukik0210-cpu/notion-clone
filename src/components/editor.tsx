import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { ja } from "@blocknote/core/locales";
import { themeAtom } from "../modules/theme/theme.state";
import { useAtomValue } from "jotai";

interface Props {
	initialContent?: string | null;
	onChange: (value: string) => void;
}


export function Editor({ initialContent, onChange }: Props) {
	const theme = useAtomValue(themeAtom);
	
	const editor = useCreateBlockNote({
		dictionary: ja,
		initialContent: initialContent ? JSON.parse(initialContent) : undefined,
	});

	return (
		<div>
			<BlockNoteView
				theme={theme}
				editor={editor}
				onChange={() => onChange(JSON.stringify(editor.document))}
			/>
		</div>
	);
}
