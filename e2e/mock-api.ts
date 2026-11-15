import type { Page, Route } from "@playwright/test";
import { MOCK_API_URL } from "../playwright.config";

// テストで使うデータの形（API が返す JSON と同じ形）
type MockUser = { id: string; email: string; name: string };
type MockNote = {
	id: number;
	title: string | null;
	content: string | null;
	parentId: number | null;
	userId: string;
	createdAt: string;
	isArchived: boolean;
	isFavorite: boolean;
	icon: string | null;
	position: number;
};

export const testUser: MockUser = {
	id: "test-user",
	email: "test@example.com",
	name: "テストユーザー",
};

// テスト用のノートを作る（id・タイトル・親・並び順以外は決まった値で埋める）
export const createMockNote = (
	id: number,
	title: string | null,
	parentId: number | null = null,
	position = 0,
): MockNote => ({
	id,
	title,
	content: null,
	parentId,
	userId: testUser.id,
	createdAt: "2026-01-01T00:00:00.000Z",
	isArchived: false,
	isFavorite: false,
	icon: null,
	position,
});

// ニセモノの API を用意する
// アプリが MOCK_API_URL に投げたリクエストを全部受け止めて、用意した答えを返す
export const mockApi = async (page: Page, options: { notes?: MockNote[] } = {}) => {
	// コピーしておく（ノートを作ったり並び替えたりしたときに、テスト側から渡したデータを書き換えないため）
	// 並び替えで note.position を書き換えるので、配列だけでなく、ノートも1つずつコピーする
	const notes = (options.notes ?? []).map((note) => ({ ...note }));

	await page.route(`${MOCK_API_URL}/**`, async (route: Route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;

		// ログイン：どんなメール・パスワードでも成功させる
		if (method === "POST" && path === "/auth/signin") {
			return route.fulfill({ json: { user: testUser, token: "test-token" } });
		}

		// ログイン中のユーザー：トークンが付いていればユーザー、なければ null（未ログイン）
		if (method === "GET" && path === "/auth/me") {
			const isSignedIn = request.headers()["authorization"] === "Bearer test-token";
			return route.fulfill({ json: isSignedIn ? testUser : null });
		}

		// サイドバーのノート一覧（一番上の階層だけ）。本物と同じく position の小さい順
		if (method === "GET" && path === "/notes") {
			const rootNotes = notes
				.filter((note) => note.parentId === null && !note.isArchived)
				.sort((a, b) => a.position - b.position);
			return route.fulfill({ json: { notes: rootNotes } });
		}

		// お気に入りの一覧
		if (method === "GET" && path === "/notes/favorites") {
			return route.fulfill({ json: { notes: notes.filter((note) => note.isFavorite) } });
		}

		// ノートを作る：本物と同じく 201 で、作ったノートを「包まずに」そのまま返す
		if (method === "POST" && path === "/notes") {
			const body = request.postDataJSON() as { title?: string; parentId?: number };
			const parentId = body.parentId ?? null;
			const nextId = Math.max(0, ...notes.map((note) => note.id)) + 1;
			// 本物と同じく、同じ親の中で一番下（今ある最大＋1。1件もなければ 0）
			const siblings = notes.filter((note) => note.parentId === parentId);
			const nextPosition = Math.max(-1, ...siblings.map((note) => note.position)) + 1;
			const newNote = createMockNote(nextId, body.title ?? null, parentId, nextPosition);
			notes.push(newNote); // 覚えておく → このあとの GET /notes や GET /notes/:id で返せる
			return route.fulfill({ status: 201, json: newNote });
		}

		// 並び替え：ids の順に position を 0, 1, 2 … と振り直して、新しい順番で返す
		// （/notes/reorder は、下の /notes/:id より前に書く。本物の Express と同じ理由）
		if (method === "PATCH" && path === "/notes/reorder") {
			const { ids } = request.postDataJSON() as { ids: number[] };
			const reordered: MockNote[] = [];
			ids.forEach((id, index) => {
				const note = notes.find((note) => note.id === id);
				if (note) {
					note.position = index;
					reordered.push(note);
				}
			});
			return route.fulfill({ json: { notes: reordered } });
		}

		// ノートを1件取る：/notes/15 のように、数字の部分が毎回変わる
		const noteIdMatch = path.match(/^\/notes\/(\d+)$/);
		if (method === "GET" && noteIdMatch) {
			const id = Number(noteIdMatch[1]);
			const note = notes.find((note) => note.id === id);
			if (!note) {
				return route.fulfill({ status: 404, json: { message: "ノートが見つかりません" } });
			}
			return route.fulfill({ json: note });
		}

		// 用意していないリクエストは 404 にする（テストを書くときに気づけるように、ログも出す）
		console.warn(`[mockApi] 未対応のリクエスト: ${method} ${path}`);
		return route.fulfill({ status: 404, json: { message: "mock not found" } });
	});
};
