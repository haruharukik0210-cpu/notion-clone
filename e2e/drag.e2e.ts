import { expect, test } from "@playwright/test";
import { createMockNote, mockApi } from "./mock-api";

test("dnd-kit でアイテムを並び替え・移動できる", async ({ page }) => {
	// 準備：ニセモノの API に、ノートを3つ持たせておく
	await mockApi(page, {
		notes: [
			createMockNote(1, "買い物メモ", null, 0),
			createMockNote(2, "読書記録", null, 1),
			createMockNote(3, "家計簿", null, 2),
		],
	});

	// 1. ログイン画面を開く
	await page.goto("/signin");

	// 2. メールアドレスとパスワードを入力する
	await page.getByLabel("メールアドレス").fill("test@example.com");
	await page.getByLabel("パスワード").fill("password");

	// 3. ログインボタンを押す
	await page.getByRole("button", { name: "ログイン" }).click();

	const item1 = page.locator(".note-drag-handle").nth(0);
	const item3 = page.locator(".note-drag-handle").nth(2);
	const box1 = await item1.boundingBox();
	const box3 = await item3.boundingBox();

	if (!box1 || !box3) {
		throw new Error(
			"ドラッグハンドル（item1 または item3）の座標を取得できませんでした",
		);
	}

	const startX = box3.x + box3.width / 2;
	const startY = box3.y + box3.height / 2;

	const targetX = box1.x + box1.width / 2;
	const targetY = box1.y + box1.height * 0.75;

	// ドラッグの前：待ち始める（まだ await しない）
	const reorderRequest = page.waitForRequest((request) =>
		request.url().endsWith("/notes/reorder"),
	);

	// 1. 要素3を掴んで少し動かし、ドラッグを開始
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + 10, startY + 10, { steps: 5 });

	// 2. 要素1の位置まで段階的に移動
	await page.mouse.move(targetX, targetY, { steps: 15 });

	// 3. ドロップ
	await page.mouse.up();

	// 現在の並び順（タイトルの配列）を取得
	const contents = page.locator(".note-item-row");

	// 期待する順番と一致しているか検証
	await expect(contents).toHaveText(["家計簿", "買い物メモ", "読書記録"]);

	// ドラッグのあと：来たリクエストを受け取って、中身を確かめる
	const request = await reorderRequest;
	expect(request.postDataJSON()).toEqual({ ids: [3, 1, 2] });
});
