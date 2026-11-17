import { expect, test } from "@playwright/test";
import { createMockNote, mockApi } from "./mock-api";

test("「ゲストで試す」を押すと、登録なしでログインでき、ゲストのお知らせが出る", async ({ page }) => {
	// 準備：本物の API がゲストに入れるサンプルノートの代わりに、ノートを2つ持たせておく
	await mockApi(page, {
		notes: [createMockNote(1, "はじめに", null, 0), createMockNote(2, "買い物メモ", null, 1)],
	});

	// 1. ログイン画面を開く（メールアドレスもパスワードも入力しない）
	await page.goto("/signin");

	// 2. 「ゲストで試す」を押す
	await page.getByRole("button", { name: "ゲストで試す" }).click();

	// 3. トップページ（/）に移動しているのを確かめる
	await expect(page).toHaveURL("/");

	// 4. サイドバーに、ノートが出るのを確かめる
	await expect(page.getByText("はじめに")).toBeVisible();

	// 5. ゲストのお知らせが出ているのを確かめる
	await expect(page.getByText("ゲストとして利用中です。")).toBeVisible();
});
