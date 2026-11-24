# Playwright のよく使うメソッド（早見表）

E2E を書くときに、手元に置いておく表です。例は、このリポジトリの `e2e/` に出てくるものに合わせています。

| 章 | 内容 |
| --- | --- |
| 0 | 全体の形と、3 つの登場人物 |
| 1 | ページを動かす（`page`） |
| 2 | 要素を探す（locator） |
| 3 | 要素を操作する |
| 4 | 確かめる（`expect`） |
| 5 | マウス・キーボードを直接動かす |
| 6 | 通信を待つ・確かめる・差し替える |
| 7 | `await` を付ける・付けないの見分け方 |
| 8 | 困ったときの道具 |
| 9 | よくあるまちがい |

---

## 0. 全体の形と、3 つの登場人物

```ts
import { expect, test } from "@playwright/test";

test("テストの名前（何を確かめるか）", async ({ page }) => {
	await page.goto("/signin");                              // ページ
	await page.getByLabel("メールアドレス").fill("a@b.com"); // 要素を探して操作
	await expect(page).toHaveURL("/");                       // 確かめる
});
```

| 登場人物 | 役割 | たとえ |
| --- | --- | --- |
| `page` | ブラウザのタブ 1 枚 | 開いているタブそのもの |
| locator（`page.getBy〜()` など） | 「この要素」という**探し方** | jQuery の `$(".foo")`。ただし、探すのは**使うとき** |
| `expect` | 結果を確かめる | `if (…) { 失敗 }` を、読みやすく書く道具 |

> **locator は「探し方」**：`page.getByRole("button")` と書いた時点では、まだ探していません。`.click()` や `expect(…)` で使うときに初めて探し、見つかるまで少し待ってくれます。だから、画面が出るのを待つコードを、自分で書かなくて済みます。

---

## 1. ページを動かす（`page`）

| メソッド | 何をするか | 例 |
| --- | --- | --- |
| `page.goto(url)` | ページを開く | `await page.goto("/signin")` |
| `page.reload()` | 読み込み直す | `await page.reload()` |
| `page.goBack()` | 戻る | `await page.goBack()` |
| `page.url()` | 今の URL（文字列）を取る | `page.url()` ※確かめるなら `toHaveURL` のほうがよい |
| `page.evaluate(関数)` | ページの中で JS を動かす | `await page.evaluate(() => localStorage.getItem("token"))` |

`goto` の URL は、`playwright.config.ts` の `baseURL`（`http://localhost:5174`）からの続きです。

---

## 2. 要素を探す（locator）

### 優先する順番

上ほど、**利用者が見ているもの**で探すので、見た目やクラス名を変えても壊れにくくなります。

| 順 | メソッド | 何で探すか | 例 |
| --- | --- | --- | --- |
| 1 | `getByRole(役割, { name })` | 役割と名前（ボタン・リンク・見出しなど） | `page.getByRole("button", { name: "ログイン" })` |
| 2 | `getByLabel(文字)` | `<label>` や `aria-label` | `page.getByLabel("メールアドレス")`、`page.getByLabel("ドラッグして並び替え")` |
| 3 | `getByPlaceholder(文字)` | `placeholder` | `page.getByPlaceholder("タイトル")` |
| 4 | `getByText(文字)` | 画面の文字 | `page.getByText("無題")` |
| 5 | `getByTestId(id)` | `data-testid` 属性 | `page.getByTestId("note-list")` |
| 6 | `locator(CSS セレクタ)` | CSS と同じ書き方 | `page.locator(".クラス名")`、`page.locator("#id")` |

> **`locator` の書き方は CSS と同じ**：クラスは `.`、ID は `#`、何も付けないとタグ名です。`locator("note-item")` は `<note-item>` というタグを探してしまいます。
>
> **共通の部品のクラスに注意**：`Item` のような共通の部品に付いたクラスは、使った場所すべてに出ます（Liquid の共通スニペットと同じ）。絞りたいときは、**呼び出す側**が包んでいる要素のクラスを使います。

### 絞り込む

| メソッド | 何をするか | 例 |
| --- | --- | --- |
| `.nth(番号)` | 何番目か（0 から） | `page.getByLabel("ドラッグして並び替え").nth(2)` |
| `.first()` / `.last()` | 最初・最後 | `page.getByRole("listitem").first()` |
| `.filter({ hasText })` | その文字を含むものだけ | `page.locator(".行").filter({ hasText: "家計簿" })` |
| 親.`getBy〜()` | 親の中だけで探す | `page.locator(".行").filter({ hasText: "家計簿" }).getByLabel("ドラッグして並び替え")` |

`.nth()` は「何番目にあるか」に頼るので、並びが変わるテストでは、`filter({ hasText })` で「どのノートか」を名指しするほうが、読む人にも伝わります。

---

## 3. 要素を操作する

| メソッド | 何をするか | 例 |
| --- | --- | --- |
| `.click()` | クリック | `await page.getByRole("button", { name: "ノートを作成" }).click()` |
| `.dblclick()` | ダブルクリック | `await locator.dblclick()` |
| `.fill(文字)` | 入力欄を**空にしてから**入力 | `await page.getByLabel("パスワード").fill("password")` |
| `.press(キー)` | キーを押す | `await locator.press("Enter")` |
| `.hover()` | マウスを乗せる（メニューを出すときなど） | `await locator.hover()` |
| `.check()` / `.uncheck()` | チェックボックス | `await locator.check()` |
| `.selectOption(値)` | `<select>` を選ぶ | `await locator.selectOption("dark")` |
| `.dragTo(先の locator)` | ドラッグ＆ドロップ（一瞬で動く） | `await a.dragTo(b)` ※ dnd-kit では効かないことがある（5 章へ） |
| `.boundingBox()` | 画面上の位置と大きさ `{ x, y, width, height }` | `const box = await locator.boundingBox()` |

---

## 4. 確かめる（`expect`）

### 画面を確かめる（`await` を付ける。条件を満たすまで最大 5 秒待つ）

| メソッド | 確かめること | 例 |
| --- | --- | --- |
| `toBeVisible()` | 見えている | `await expect(page.getByText("無題")).toBeVisible()` |
| `not.toBeVisible()` | 見えていない | `await expect(banner).not.toBeVisible()` |
| `toHaveText(文字 / 配列)` | 文字がその通り。配列なら、**上から順に全部** | `await expect(rows).toHaveText(["A", "B", "C"])` |
| `toContainText(文字)` | その文字を含む | `await expect(alert).toContainText("失敗")` |
| `toHaveCount(数)` | 当てはまる要素の数 | `await expect(handles).toHaveCount(3)` |
| `toHaveValue(値)` | 入力欄の値 | `await expect(input).toHaveValue("買い物メモ")` |
| `toHaveAttribute(名前, 値)` | 属性 | `await expect(link).toHaveAttribute("href", "/notes/1")` |
| `toHaveClass(値)` | クラス | `await expect(row).toHaveClass(/is-dragging/)` |
| `toBeEnabled()` / `toBeDisabled()` | 押せる・押せない | `await expect(button).toBeDisabled()` |
| `toHaveURL(url)` | 今の URL（`page` に使う） | `await expect(page).toHaveURL("/notes/3")` |

### 値を確かめる（`await` を付けない。その場で比べるだけ）

| メソッド | 確かめること | 例 |
| --- | --- | --- |
| `toBe(値)` | 同じ値（数・文字・真偽） | `expect(count).toBe(3)` |
| `toEqual(値)` | 中身が同じ（配列・オブジェクト） | `expect(request.postDataJSON()).toEqual({ ids: [3, 1, 2] })` |
| `toBeNull()` | `null` | `expect(token).toBeNull()` |
| `toBeTruthy()` | 「ある」扱いの値 | `expect(box).toBeTruthy()` |

Vitest の `expect` と同じ名前・同じ意味です。

---

## 5. マウス・キーボードを直接動かす

`dragTo` が効かないとき（dnd-kit のように「何 px 動いたらドラッグ開始」という決まりがあるとき）に使います。

| メソッド | 何をするか |
| --- | --- |
| `page.mouse.move(x, y, { steps })` | マウスを動かす。`steps` は何回に分けて動かすか（多いほど、ゆっくり） |
| `page.mouse.down()` | ボタンを押す（つかむ） |
| `page.mouse.up()` | ボタンを離す（落とす） |
| `page.keyboard.press(キー)` | キーを押す（`"Space"`、`"ArrowUp"`、`"Enter"` など） |
| `page.keyboard.type(文字)` | 1 文字ずつ打つ |

```ts
await page.mouse.move(startX, startY);              // つまみの上へ
await page.mouse.down();                            // つかむ
await page.mouse.move(startX, startY - 10, { steps: 5 });  // 少し動かして、ドラッグを始めさせる
await page.mouse.move(targetX, targetY, { steps: 15 });    // 目的の位置まで、少しずつ
await page.mouse.up();                              // 落とす
```

---

## 6. 通信を待つ・確かめる・差し替える

| メソッド | 何をするか | 例 |
| --- | --- | --- |
| `page.waitForRequest(条件)` | 条件に合うリクエストが**送られる**のを待つ | `page.waitForRequest((r) => r.url().endsWith("/notes/reorder"))` |
| `page.waitForResponse(条件)` | 条件に合う**返事**が来るのを待つ | `page.waitForResponse((r) => r.url().endsWith("/notes"))` |
| `page.route(URL, 関数)` | リクエストを横取りして、好きな返事を返す | `mock-api.ts` で使っている |
| `route.fulfill({ status, json })` | 横取りしたリクエストに返事をする | `route.fulfill({ status: 500, json: { message: "…" } })` |

### リクエストから取り出せるもの

| メソッド | 中身 |
| --- | --- |
| `request.url()` | URL |
| `request.method()` | `"GET"`・`"PATCH"` など |
| `request.headers()` | ヘッダー（`authorization` など） |
| `request.postDataJSON()` | 送った中身（ボディ）を JSON として |

### 待つときの形（大事）

```ts
const waiting = page.waitForRequest(…);  // ① 先に予約（await しない）
await 何か操作();                          // ② リクエストが送られる操作
const request = await waiting;            // ③ 届いたものを受け取る
```

① を ② のあとに書くと、もう送り終わっているので、いつまでも届きません。`addEventListener` を、クリックの前に登録しておくのと同じです。

---

## 7. `await` を付ける・付けないの見分け方

| 書いたもの | `await` | 理由 |
| --- | --- | --- |
| `page.goto()`・`.click()`・`.fill()` などの操作 | 付ける | ブラウザが動き終わるのを待つ |
| `expect(locator).toBe〜()`・`expect(page).toHaveURL()` | **付ける** | 条件を満たすまで、待ちながら確かめ直す |
| `expect(値).toBe()`・`toEqual()` | 付けない | 手元の値を、その場で比べるだけ |
| `page.getBy〜()`・`.nth()`・`.filter()` | 付けない | 「探し方」を作るだけで、まだ探していない |
| `page.waitForRequest()` | **その場では付けない** | 予約だけしておき、操作のあとで `await` する |

> **付け忘れたとき**：画面の `expect` に `await` がないと、確かめ終わる前にテストが終わります。ログの最後に `Test ended.` と出たら、まず `await` の付け忘れを疑ってください。

---

## 8. 困ったときの道具

| コマンド・メソッド | 何ができるか |
| --- | --- |
| `npx playwright test e2e/drag.e2e.ts` | ファイルを 1 つだけ動かす |
| `npx playwright test --ui` | 画面付きで動かす。1 手ずつ、そのときの画面が見られる |
| `npx playwright test --headed` | ブラウザを見えるようにして動かす |
| `npx playwright codegen http://localhost:5174` | 自分で操作すると、その操作のコードを書いてくれる（探し方の参考になる） |
| `await page.pause()` | テストの途中で止める。止まった画面で、探し方を試せる |
| `npx playwright show-report` | 前回の結果（失敗したときの画面・トレース）を見る |

---

## 9. よくあるまちがい

| まちがい | 何が起きるか | 直し方 |
| --- | --- | --- |
| `locator("クラス名")`（点なし） | タグ名として探して、見つからない → タイムアウト | `locator(".クラス名")` |
| 共通の部品のクラスで探す | 関係ない要素まで取れる | 呼び出す側のクラスや、`getByRole`・`getByLabel` で探す |
| 画面の `expect` に `await` がない | 確かめる前にテストが終わる | `await expect(…)` |
| `allTextContents()` で読んでから `toEqual` | 画面が変わる前に一度だけ読むので、たまに落ちる | `await expect(locator).toHaveText([...])`（待ってくれる） |
| `waitForRequest` を操作のあとに書く | もう送られたあとなので、届かない | 操作の**前**に予約する |
| `dragTo` で dnd-kit を動かす | 動かない（ドラッグが始まらない） | `page.mouse` で少しずつ動かす |
| テスト名が中身と合っていない | 落ちたときに、何が壊れたかわからない | 名前だけで場面がわかるようにする |
