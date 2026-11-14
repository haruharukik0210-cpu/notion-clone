import { expect, test } from "@playwright/test";
import { createMockNote, mockApi } from "./mock-api";

test("ログインすると、サイドバーに自分のノートが表示される", async ({ page }) => {
	// 準備：ニセモノの API に、ノートを2つ持たせておく
	await mockApi(page, {
		notes: [createMockNote(1, "買い物メモ"), createMockNote(2, "読書記録")],
	});

	// 1. ログイン画面を開く
	await page.goto("/signin");

	// 2. メールアドレスとパスワードを入力する
	await page.getByLabel("メールアドレス").fill("test@example.com");
	await page.getByLabel("パスワード").fill("password");

	// 3. ログインボタンを押す
	await page.getByRole("button", { name: "ログイン" }).click();

	// 4. サイドバーに、2つのノートのタイトルが出るのを確かめる
	await expect(page.getByText("買い物メモ")).toBeVisible();
	await expect(page.getByText("読書記録")).toBeVisible();

	// 5. ログイン画面からトップページ（/）に移動しているのを確かめる
	await expect(page).toHaveURL("/");
});
