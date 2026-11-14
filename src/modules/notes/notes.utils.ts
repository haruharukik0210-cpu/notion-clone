import type { Note } from "./note.entity";

export const mergeNotes = (oldNotes: Note[], newNotes: Note[]): Note[] => {
	const combineNotes = [...oldNotes, ...newNotes];
	const uniqueNotes: { [key: number]: Note } = {};
	for (const note of combineNotes) {
		uniqueNotes[note.id] = note;
	}
	return Object.values(uniqueNotes);
};

export const findChildrenIds = (notes: Note[], parentId: number): number[] => {
	const childrenIds = notes
		.filter((note) => note.parentId === parentId)
		.map((note) => note.id);
	return childrenIds.concat(
		...childrenIds.map((childId) => findChildrenIds(notes, childId)),
	);
};

// ノートの「場所」を表す文字列を作る（例：「親 / 子」）
// 先祖のタイトルを、上の階層から順に「 / 」でつなぐ。自分自身のタイトルは入れない
export const getNotePath = (notes: Note[], note: Note): string => {
	let current = note;
	const titles: string[] = [];

	while (current.parentId != null) {
		const parent = notes.find((n) => n.id === current.parentId);
		if (!parent) break; 
		titles.unshift(parent.title || "無題"); 
		current = parent; 
	}

	return titles.join(" / ");
};
