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
};

export const testUser: MockUser = {
	id: "test-user",
	email: "test@example.com",
	name: "テストユーザー",
};

// テスト用のノートを作る（id とタイトル以外は決まった値で埋める）
export const createMockNote = (
	id: number,
	title: string | null,
	parentId: number | null = null,
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
});

// ニセモノの API を用意する
// アプリが MOCK_API_URL に投げたリクエストを全部受け止めて、用意した答えを返す
export const mockApi = async (page: Page, options: { notes?: MockNote[] } = {}) => {
	// コピーしておく（ノートを作ったときに、テスト側から渡された配列を書き換えないため）
	const notes = [...(options.notes ?? [])];

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

		// サイドバーのノート一覧（一番上の階層だけ）
		if (method === "GET" && path === "/notes") {
			return route.fulfill({
				json: { notes: notes.filter((note) => note.parentId === null && !note.isArchived) },
			});
		}

		// お気に入りの一覧
		if (method === "GET" && path === "/notes/favorites") {
			return route.fulfill({ json: { notes: notes.filter((note) => note.isFavorite) } });
		}

		// ノートを作る：本物と同じく 201 で、作ったノートを「包まずに」そのまま返す
		if (method === "POST" && path === "/notes") {
			const body = request.postDataJSON() as { title?: string; parentId?: number };
			const nextId = Math.max(0, ...notes.map((note) => note.id)) + 1;
			const newNote = createMockNote(nextId, body.title ?? null, body.parentId ?? null);
			notes.push(newNote); // 覚えておく → このあとの GET /notes や GET /notes/:id で返せる
			return route.fulfill({ status: 201, json: newNote });
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
