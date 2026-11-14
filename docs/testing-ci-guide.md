# テスト・チェック・CI 手順書

## 進め方

```
Step 1  Lint のエラーを直す              … あなた（設定の変更は AI）
Step 2  GitHub Actions で CI を作る       … AI が書いて解説
Step 3  ユニットテスト（Vitest）          … 準備は AI／テストを書くのはあなた
Step 4  E2E テスト（Playwright）          … あとで（Step 3 が終わってから）
```

1つずつ PR にして、master にマージしながら進めます。**Step 2 の CI ができると、Step 3 以降の PR は自動でチェックされる**ようになります。

### 用語のおさらい

| 名前 | ひとことで | たとえ |
| --- | --- | --- |
| Lint（ESLint） | コードの書き方チェック | 文章の校正ツール |
| 型チェック（tsc） | 型の食い違いチェック | これまで出てきた赤い型エラー |
| ユニットテスト（Vitest） | 関数1つずつのテスト | 電卓のボタンを1つずつ押して確かめる |
| E2E テスト（Playwright） | ロボットがブラウザを操作するテスト | 人の代わりに、ロボットがクリックして確かめる |
| CI（GitHub Actions） | 上のチェックを、PR のたびに自動で実行 | 提出前に、自動で検品してくれる係 |
| CD | マージしたら自動で本番に出す | **もうできている**（Vercel・Render） |

---

## 0. 準備（Sourcetree）

1. **両方のリポジトリ**で `master` をチェックアウト → **プル**（アイコン機能のマージを取り込む）
2. **notion-clone-app** で、master から新しいブランチ **`chore/lint`** を作る

`chore` は「機能の追加でもバグ修正でもない、開発の環境づくり」のときに使う種類です（`feat`・`fix` の仲間）。

---

## Step 1：Lint のエラーを直す

### Lint を実行してみる

VS Code のターミナルで、notion-clone-app のフォルダで実行します。

```bash
npm run lint
```

2026-11-10 時点で **20件（エラー13・警告7）** 出ています。

- **エラー（error）**：直すべきもの。CI では、1件でもあると**失敗（❌）**になる
- **警告（warning）**：気をつけたほうがいいもの。CI は失敗にならない

### 指摘の内訳

大きく **2つのグループ** に分かれます。

#### グループ A：自分たちで書いたコード（あなたが直す）

| ファイル:行 | ルール | 何を言われている？ |
| --- | --- | --- |
| `NoteDetail.tsx:85` | `no-unused-expressions` | 三項演算子を、値を作らずに「処理の分岐」として使っている |
| `App.tsx:19`・`Layout.tsx:24` | `react-hooks/immutability` | useEffect の中で、**あとで宣言する関数**を使っている |
| `NoteDetail.tsx:37` | `react-hooks/set-state-in-effect` | useEffect の中で、すぐに state を変えている |
| `App.tsx:20`・`Layout.tsx:25`・`NoteDetail.tsx:38` | `react-hooks/exhaustive-deps`（警告） | useEffect の中で使っている関数が、依存配列 `[ ]` に入っていない |

**ヒント**

- **`no-unused-expressions`**：お気に入りのエラー表示（`!isFavorite ? alert(…) : alert(…)`）です。「処理を分けたい」ときは三項演算子ではなく `if` を使います。または、**メッセージだけを三項演算子で選んで、alert は1回だけ呼ぶ**形にもできます（三項演算子は「値を作る」ためのもの）
- **`immutability`**：今はこうなっています

  ```
  useEffect(() => { fetchCurrentUser(); }, []);   ← ここで使っている
  const fetchCurrentUser = async () => { … };     ← ここで宣言している（あと）
  ```

  JS は動きますが、「**使う前に宣言する**」順番のほうが読みやすく、React のルールにも合います。関数を useEffect より**上に移す**か、**useEffect の中で宣言する**かで直せます
- **`exhaustive-deps`（警告）**：上の `immutability` の直し方で「useEffect の中で関数を宣言する」を選ぶと、この警告も一緒に消えます。理由を考えてみてください（依存配列は「**外から**使っているもの」を書く場所でした）
- **`set-state-in-effect`**：NoteDetail の `fetchOne` の中の `setIsLoading(true)` です。少し難しいので、**最後に回して OK**。ほかを直してから一緒に考えましょう

#### グループ B：講座で用意された UI 部品（`src/components/ui/` の中）

`dialog.tsx`・`dropdown-menu.tsx`・`input.tsx` の **12件**（`any` の使用、使っていない変数、refs の扱いなど）。

これらは講座が用意した**共通の UI 部品**で、自分たちではほとんど触っていないコードです。

| 方針 | よいところ | 気になるところ |
| --- | --- | --- |
| **a. Lint の対象から外す** | すぐ終わる。shadcn/ui などの「外から持ってきた部品」を外すのは、現場でもよくある | 中の問題には気づけなくなる |
| b. 全部直す | コードがきれいになる | 自分で書いていないコードなので、直すのに時間がかかる |

→ **おすすめは a**。外すなら、`eslint.config.js` の `globalIgnores` に `src/components/ui` を足すだけです（**設定なので AI がやります**）。

**現場の感覚**：「全部完璧にする」より、「**自分たちのコードを守る範囲を決めて、そこは必ず守る**」ほうが、続けられるルールになります。

### Step 1 のゴール

```bash
npm run lint
```

で、**エラーが 0 件**になること（警告は残っていても OK）。できたらコミット → PR → マージ。

---

## Step 2：GitHub Actions で CI を作る（AI が書いて解説）

### 何をするか

PR を作ったり、プッシュしたりするたびに、**GitHub のサーバーが自動で**次の3つを実行します。

```
① npm ci         … package-lock.json どおりにライブラリを入れる
② npm run lint   … Lint
③ npm run build  … 型チェック（tsc -b）＋ ビルド（vite build）
```

1つでも失敗すると、PR の画面に **❌** が出ます。全部通れば **✅**。

**今までとの違い**：今は、型エラーがあると **マージしたあと**に Vercel のビルドが失敗して気づきます。CI があると、**マージする前**の PR の画面で気づけます。

### AI が作るもの

| ファイル | 中身 |
| --- | --- |
| `.github/workflows/ci.yml` | 「いつ・何を実行するか」を書いた設定ファイル（YAML という書き方） |
| `.nvmrc` | 使う Node.js のバージョン（ローカルと CI でそろえる） |
| `README.md` | CI の結果を表すバッジ（✅ passing の小さな画像）を追加 |

書いたあとに、YAML の読み方（`on`・`jobs`・`steps`）を解説します。

### AI が作ったもの（2026-11-12）

| ファイル | 状態 |
| --- | --- |
| `.github/workflows/ci.yml` | 新規 |
| `.nvmrc` | 新規（中身は `24`） |
| `README.md` | 先頭にタイトルと CI バッジを追加 |

まっさらなフォルダで CI と同じ `npm ci` → `npm run lint` → `npm run build` を実行し、**全部通ること**を確認済みです。

### ci.yml の読み方

YAML は「**インデント（字下げ）で入れ子を表す**」書き方です。HTML のタグの入れ子を、`<div>` の代わりにスペースで表しているイメージです。`#` から後ろはコメントです。

```yaml
name: CI            # ← GitHub の画面に出る名前

on:                 # ← 「いつ」動かすか
  pull_request:     #    PR を作ったとき・PR のブランチにプッシュしたとき
  push:
    branches: [master]   # master が更新されたとき（マージも含む）

jobs:               # ← 「何を」するか（仕事のまとまり）
  check:
    runs-on: ubuntu-latest   # GitHub が貸してくれる Linux のパソコンで動かす
    steps:                   # ← 上から順番に実行する手順
      - uses: actions/checkout@v5     # ① コードを取ってくる
      - uses: actions/setup-node@v5   # ② Node.js を入れる
        with:
          node-version-file: .nvmrc   #    バージョンは .nvmrc から読む
          cache: npm                  #    ライブラリを保存して2回目以降を速くする
      - run: npm ci           # ③ ライブラリを入れる
      - run: npm run lint     # ④ Lint
      - run: npm run build    # ⑤ 型チェック＋ビルド
```

**処理の流れ**

1. あなたが PR を作る（またはプッシュする）
2. GitHub が `.github/workflows/` の中の YAML を見つけて、`on` の条件に合うか確かめる
3. 合えば、空っぽの Linux のパソコンを1台用意して、`steps` を上から順に実行する
4. どれか1つでも失敗したら、そこで止まって **❌**。最後まで行けば **✅**
5. 終わったらそのパソコンは捨てられる（毎回まっさらな状態から始まる）

**ポイント**

- **`uses` と `run` の違い**：`uses` は、ほかの人が作った**部品**（アクション）を使います。`run` は、ターミナルで打つ**コマンド**をそのまま実行します。Shopify でたとえると、`uses` はアプリ、`run` は自分で書いた Liquid のようなものです
- **`npm install` ではなく `npm ci` なのはなぜ？**：`npm ci` は `package-lock.json` に書かれたバージョンを**そのまま**入れます。lock と package.json が食い違っていたら、エラーで止まります。「毎回同じものを入れる」ことが大事な CI 向けのコマンドです
- **`.nvmrc` はなぜ必要？**：ローカルの Node.js は v24 です。CI でも同じ 24 を使うことで、「ローカルでは動くのに CI では動かない」を防ぎます
- **`.env` がなくても大丈夫？**：`VITE_API_URL` はビルドのときには空でも失敗しません。CI は「ビルドが通るか」だけを確かめるので、問題ありません（本番の値は Vercel 側で設定済みです）
- **Vercel との関係**：CI は**チェックだけ**です。本番への公開は、今までどおり Vercel がマージ後に行います

### Sourcetree での進め方

ブランチは **Lint の PR → CI の PR** の順に、1つずつマージします。

1. **Lint の PR を先に出す**
   - `chore/lint` をプッシュ（「プッシュ」ボタン → `chore/lint` にチェック）
   - GitHub で PR を作って、マージする
   - ※ CI のファイルは**まだコミットしない**（未コミットのまま置いておく）
2. **master をチェックアウト → プル**
   - 未コミットの CI ファイルは、ブランチを切り替えてもそのままついてきます
3. **master から `chore/ci` ブランチを作る**（「ブランチ」ボタン）
4. **CI のファイルをコミット**：`.github/workflows/ci.yml`・`.nvmrc`・`README.md` をステージして、コミット
   ```
   chore: GitHub Actions で Lint とビルドを自動チェックする
   ```
5. **プッシュ → PR を作る**
   - PR の画面の下のほうに「**Checks**」が出て、黄色の ● （実行中）→ 緑の ✅ になるのを見る
   - **この PR 自体が、最初の CI の実行になります**
6. ✅ を確認したらマージ。master の README にバッジが表示されます

### （任意）マージの前に CI を必須にする

GitHub の設定で「**CI が ✅ にならないと、マージボタンを押せない**」ようにできます（Branch protection）。1人開発でも、うっかりのマージを防げます。

**実際にあったこと**：PR #6 は、CI がまだ ● 実行中のうちにマージされていました（今回は結果が ✅ だったので問題なし）。CI が ❌ でもマージできてしまう状態なので、ルールで止めます。

**たとえ**：EC サイトで「在庫チェックが終わるまで、注文確定ボタンを押せない」ようにするのと同じです。

#### 設定する中身

| ルール | 意味 | 設定 |
| --- | --- | --- |
| Require a pull request before merging | master に直接プッシュできず、必ず PR を通す | ON（必要な承認数は **0**。1人開発なので） |
| Require status checks to pass | 指定したチェックが ✅ になるまでマージできない | ON、チェックに **`Lint & Build`** を追加 |
| Block force pushes | master の履歴を強制的に書き換えられない | ON（最初から ON） |
| Restrict deletions | master ブランチを消せない | ON（最初から ON） |

`Lint & Build` は、ci.yml の `name: Lint & Build`（job の名前）です。GitHub はこの名前でチェックを見分けます。

#### 手順（GitHub の画面）

リポジトリ `haruharukik0210-cpu/notion-clone` は public なので、無料で使えます。

1. リポジトリのページ → 上の **Settings**
2. 左のメニュー **Rules** → **Rulesets**
3. **New ruleset** → **New branch ruleset**
4. 上から順に入力
   - **Ruleset Name**：`master を守る` など
   - **Enforcement status**：**Active**
   - **Bypass list**：空のまま（自分も例外にしない）
   - **Target branches**：**Add target** → **Include default branch**（＝ master）
5. **Rules** の欄
   - **Restrict deletions**・**Block force pushes**：チェックが入っていることを確認
   - **Require a pull request before merging**：チェック → 開いた設定の **Required approvals** は `0` のまま
   - **Require status checks to pass**：チェック → **Add checks** → `Lint & Build` を選ぶ（候補に出ないときは、入力して追加）
6. 一番下の **Create** で保存

※ GitHub の画面は、ときどき文言や並びが変わります。見つからないときは、スクリーンショットを見せてください。

#### 設定したあと変わること

- Sourcetree で **master に直接プッシュしようとすると、拒否される**ようになります（今までどおり、ブランチ → PR → マージで進めれば影響なし）
- PR の画面で、CI が終わるまでマージボタンがグレーになります
- Vercel のチェック（プレビューのデプロイ）は必須にしていないので、Vercel 側の状態ではマージを止めません

#### （おまけ）ちゃんと止まるか試す

わざと Lint エラーを入れたブランチで PR を作ると、❌ になってマージボタンが押せないことを確認できます。確認したら、PR はマージせずに閉じます。

### API（notion-clone-api-postgres）は？

API にも、同じ形の CI を入れました（2026-11-12、AI が作成。まだコミットしていません）。

| ファイル | 中身 |
| --- | --- |
| `.github/workflows/ci.yml` | `npm ci` → `npm run build`（tsc で型チェック＋ビルド）。job の名前は **`Build`** |
| `.nvmrc` | `24` |
| `README.md` | 新規（タイトル・CI バッジ・フロントへのリンク） |

まっさらなフォルダで `npm ci` → `npm run build` を実行し、通ることを確認済みです。

**フロントとの違い**

- **Lint がない**：API には ESLint が入っていないので、ビルドだけです。`tsc` が型エラーを見つけてくれるので、「マージしてから Render のビルドが失敗して気づく」は防げます
- **`.nvmrc` が本番にも効く**：Render は `.nvmrc` を読んで Node.js のバージョンを決めます。今の本番は Render の既定値の **Node.js 24** で動いているので、`24` と書いても本番の動きは変わりません。むしろ、Render が既定値を変えても 24 のまま固定されるので安全です

#### Sourcetree での進め方（API）

1. notion-clone-api-postgres で、master から **`chore/ci`** ブランチを作る（未コミットのファイルはついてきます）
2. `.github/workflows/ci.yml`・`.nvmrc`・`README.md` をコミット
   ```
   chore: GitHub Actions でビルドを自動チェックする
   ```
3. **プッシュはターミナルで**（ワークフローのファイルが入っているため。Sourcetree だと前回と同じエラーになります）
   ```bash
   git push -u origin chore/ci
   ```
4. GitHub で PR を作る → Checks が ✅ になったらマージ
5. （任意）フロントと同じ Ruleset を API にも作る。違いは、必須にするチェックの名前が **`Build`** であることだけ

#### （任意）Render を「CI が通ってからデプロイ」にする

今の Render は、master にコミットが入ったら**すぐ**デプロイします（Auto-Deploy：On Commit）。CI が ✅ になるのを待ってからデプロイするように変えられます。

- Render のダッシュボード → `notion-clone-api-postgres-1` → **Settings** → **Build & Deploy** → **Auto-Deploy** を **After CI Checks Pass** に変更

Ruleset で「CI が ✅ でないとマージできない」ようにしていれば、master に入るのは ✅ のものだけなので、効果は「念のための二重チェック」程度です。

---

## Step 3：ユニットテスト（Vitest）

### 準備（AI がやったこと・2026-11-12）

| ファイル | 変更 |
| --- | --- |
| `package.json` | `vitest@5.1.0` を追加。`npm test`（1回だけ実行）と `npm run test:watch`（保存のたびに自動で再実行）を追加 |
| `.github/workflows/ci.yml` | 最後に `npm test` を追加（job 名は `Lint & Build` のまま。Ruleset がこの名前を見ているため） |
| `src/sample.test.ts` | 動作確認用のテスト（`1 + 1 は 2`）。**本物のテストを書いたら消す** |

`npm test` → 1件成功、`npm run lint`・`npm run build` も通ることを確認済みです。

**Vitest を選んだ理由**：このアプリは Vite で動いています。Vitest は Vite と同じ仕組みで動くので、設定ファイルなしでそのまま使えます。Jest（昔からある定番）だと、TypeScript を読ませる設定が別に必要です。

### 0. ブランチを作る（Sourcetree）

1. フロントの master で、**`test/notes-utils`** ブランチを作る（未コミットの変更はそのままついてくる）
2. この時点で一度コミットしておくと安心です
   ```
   test: Vitest を導入し、CI でテストを実行する
   ```
3. **プッシュはターミナルで**（ci.yml を変えたので）：`git push -u origin test/notes-utils`

`test` は「テストの追加・修正」を表す種類です（`feat`・`fix`・`chore` の仲間）。

### テストの読み方（3つだけ覚える）

```ts
import { describe, expect, it } from "vitest";

describe("足し算", () => {          // テストのグループ名（何のテストか）
  it("1 + 1 は 2", () => {          // 1つのテスト（どうなるべきか）
    expect(1 + 1).toBe(2);          // 「実際の値」が「期待する値」になるか確かめる
  });
});
```

- **`expect(実際).toBe(期待)`**：数字・文字列・true/false を比べる
- **`expect(実際).toEqual(期待)`**：**配列やオブジェクト**を「中身が同じか」で比べる。配列に `toBe` を使うと、中身が同じでも「別の箱」なので失敗します（前に出てきた「封筒は毎回新しい」と同じ話です）
- ファイル名を **`〇〇.test.ts`** にすると、Vitest が自動で見つけて実行します

**たとえ**：EC サイトの「送料の計算」に、「5,000円以上なら0円」「4,999円なら600円」のような**チェック表**を作って、毎回自動で確かめてくれるイメージです。

### 1つ目：ノートの一覧を混ぜる処理（ここから始める）

#### ① 取り出す（あなたが書く）

今は `notes.state.ts` の `set` の中の `setNotes((oldNotes) => { … })` に、混ぜる処理が埋まっています。

1. `src/modules/notes/` に新しいファイル（例：`notes.utils.ts`）を作る
2. 混ぜる処理を、**ふつうの関数**として書いて `export` する
   - 引数：古い一覧と、新しく来た一覧（どちらも `Note[]`）
   - 戻り値：混ぜたあとの一覧（`Note[]`）
   - 中身：今の `{ … }` の中身をほぼそのまま持ってくる
3. `notes.state.ts` の `setNotes((oldNotes) => …)` から、その関数を呼ぶだけにする
4. アプリを動かして、今までどおり表示されるか確認

**ヒント**：フックの中にあった処理を外に出すと、`useState` や jotai に触らない「引数 → 戻り値」だけの関数になります。これが**テストしやすい形**です。

#### ② シナリオ表を作る（あなたが書く）

いつもの「シナリオ表」と同じです。**入力と、期待する結果**を先に表にします。

| # | 古い一覧 | 新しい一覧 | 期待する結果 |
| --- | --- | --- | --- |
| 1 | 空 | id:1 | ？ |
| 2 | id:1（タイトル A） | id:1（タイトル B） | ？ |
| 3 | id:1 | id:2 | ？ |
| 4 | （自分で考える） | | |

**考えるヒント**：結果の**並び順**はどうなるでしょう？　古い一覧が id:5 → id:2 の順のとき、混ぜた結果は何の順番になるか。予想してから、テストで確かめてみてください（ちょっとした発見があります）。

#### ③ テストを書く（あなたが書く）

1. `notes.utils.test.ts` を、`notes.utils.ts` と同じフォルダに作る
2. シナリオ表の1行を、`it` 1つにする
3. ターミナルで `npm run test:watch` を実行したままにする → 保存するたびに結果が出る

**ヒント**：テスト用の `Note` を毎回全部の項目で書くのは大変です。「id とタイトルだけ渡すと、ほかの項目は適当な値で埋めた `Note` を返す」小さな関数をテストファイルの中に作ると楽になります。

④ 書けたら `src/sample.test.ts` を消して、コミット → プッシュ → PR（CI でテストも動くのを確認）

### 2つ目以降（1つ目が終わってから）

| 関数 | 今ある場所 | 確かめたいこと |
| --- | --- | --- |
| 子孫のノートを全部探す | `notes.state.ts` の `deleteNote` の中（`findChildrenIds`） | 子・孫・ひ孫まで全部見つかる／関係ないノートは入らない |
| ノートのパスを作る | `Layout.tsx` の `getPath` | 「親 / 子」の文字列になる／親が見つからないときはそこで止まる／タイトルがないと「無題」 |

`getPath` は今、`notes` と `noteStore` を**関数の外から**読んでいます。取り出すときは、「全部のノートの一覧」を**引数で受け取る**形にするのがポイントです。

---

## Step 4：E2E テスト（Playwright）… あとで

ロボットがブラウザを操作して、「**ログイン → ノートを作る → タイトルを入れる → サイドバーに出る**」のような流れを確かめるテストです。

テスト用のユーザーや DB の準備が必要になるので、Step 3 が終わってから考えます。

---

## ポートフォリオでの見せ方（ゴール）

README に、次のことを書けるようになります。

- CI のバッジ（✅ passing）
- 「PR ごとに Lint・型チェック・ビルド・テストを自動で実行している」
- 「テストしやすいように、ロジックを純粋関数に切り出した」（設計の判断として説明できる）
