import { defineConfig, devices } from "@playwright/test";

// E2E テストの中だけで使う「ニセモノの API」の住所
// 本物の API（Render）には一切つながない。この住所へのリクエストは、テストの中で Playwright が受け止める
export const MOCK_API_URL = "http://localhost:9999";

export default defineConfig({
	// テストファイルの場所と名前（*.e2e.ts にして、Vitest のテスト *.test.ts と混ざらないようにする）
	testDir: "./e2e",
	testMatch: "**/*.e2e.ts",

	// CI では、失敗したら1回だけやり直す（E2E はたまたま失敗することがあるため）
	retries: process.env.CI ? 1 : 0,

	// 結果の表示。CI ではログ向け、手元では HTML レポートも作る
	reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],

	use: {
		baseURL: "http://localhost:5174",
		// 失敗したときだけ、操作の記録（トレース）を残す。あとで画面ごとに見返せる
		trace: "retain-on-failure",
	},

	// 使うブラウザ（まずは Chrome 系だけ）
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

	// テストの前にアプリ（Vite の開発サーバー）を起動する
	webServer: {
		// いつもの npm run dev（5173）とぶつからないように、5174 番で起動する
		command: "npm run dev -- --port 5174 --strictPort",
		url: "http://localhost:5174",
		reuseExistingServer: !process.env.CI,
		// .env の VITE_API_URL より、こちらが優先される → アプリはニセモノの住所に API を投げる
		env: { VITE_API_URL: MOCK_API_URL },
	},
});
