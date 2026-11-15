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

// 同じ親の中のノート一覧（position の順に並んだもの）と、
// 動かしたノートの id（active）、落とした先のノートの id（over）を受け取って、
// 並び替えたあとの一覧を返す
export const reorderNotes = (
	notes: Note[],
	activeId: number,
	overId: number,
): Note[] => {
	const activeIndex = notes.findIndex((note) => note.id === activeId);
	const overIndex = notes.findIndex((note) => note.id === overId);
	if (activeIndex === -1 || overIndex === -1) {
		return notes; // どちらかのノートが見つからなければ、元の配列を返す
	}

	const updatedNotes = [...notes];
	const movedNote = updatedNotes.splice(activeIndex, 1)[0];
	updatedNotes.splice(overIndex, 0, movedNote);
	// 並び替えた順に、position を 0, 1, 2 … と振り直す（元のノートは書き換えない）
	return updatedNotes.map((note, index) => ({ ...note, position: index }));
};
