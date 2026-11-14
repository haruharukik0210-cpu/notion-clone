import { expect, test } from "@playwright/test";
import { createMockNote, mockApi } from "./mock-api";

test("＋を押すと、新しいノートができて詳細画面に移る", async ({ page }) => {
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

    //4. 「ノートを作成」を押す
	await page.getByRole("button", { name: "ノートを作成" }).click();

    //5. 新しいノートができて、詳細画面に移るのを確かめる
	await expect(page.getByText("無題")).toBeVisible();
	await expect(page).toHaveURL("/notes/3");
});
