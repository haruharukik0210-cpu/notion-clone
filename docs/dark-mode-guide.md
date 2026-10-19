# ダークモード実装 手順書

## 役割分担

| 担当 | 範囲 |
|---|---|
| 🎨 **AI** | 見た目（CSS、ボタンの見た目のコンポーネント） |
| 🧠 **あなた** | ロジック（state、`<html>` への反映、保存、各部分をつなぐ処理） |

AI が作る UI 部品は、**props（親から受け取るデータ）を受け取って表示するだけ**の作りにします。
そのため、「何が起きるか」を決めるロジックは、すべてあなたが書く部分に残ります。

---

## 全体の流れ

```
[ボタンをクリック]
   ↓ ① onToggle が呼ばれる                     … あなた
[themeAtom が "light" ⇄ "dark" に変わる]
   ↓ ② useEffect が変化に気づく                 … あなた
[<html data-theme="dark"> が付く ＋ localStorage に保存]
   ↓ ③ CSS の [data-theme="dark"] が有効になる   … AI
[CSS変数が上書きされ、画面全体の色が変わる]
```

ポイントは、**React は「属性を付け外しするだけ」で、色を変えるのは CSS の仕事**という分担です。
PHP のテーマで `body_class()` によってクラスを付け、CSS 側でスタイルを切り替えるのと同じ考え方です。

---

## Step 1 🎨 AI：ダーク用の CSS 変数を用意する

### 1-1. `variables.css` の `[data-theme="dark"]` に、ダーク用の色を書く

`:root` で定義されている **Semantic Colors**（「背景」「文字」「枠線」のように役割で名前をつけた色）を、暗い色で上書きします。

```css
[data-theme="dark"] {
  --color-background: hsl(0, 0%, 10%);  /* 例：ほぼ黒の背景 */
  --color-foreground: hsl(0, 0%, 90%);  /* 例：明るい文字 */
  ...
}
```

`--color-white` などの**素の色の名前**は上書きしません。上書きすると「white という名前なのに黒い」という、読み手を混乱させる状態になってしまうからです。

### 1-2. 素の色を直接使っている箇所を、役割の変数に置き換える

調べたところ、いくつかの CSS では素の色を直接指定していました。これらは 1-1 の上書きでは色が変わりません。

| ファイル | 今の指定 | 問題 |
|---|---|---|
| `layout.css` `.sidebar` | `var(--color-neutral-100)` | サイドバーが白っぽいまま |
| `popover.css` `.popover-content` | `var(--color-white)` | メニューが白いまま |
| `button.css` / `home.css` のボタン | `var(--color-slate-900)` / `#1e293b` | ボタンの色が固定 |
| `input.css` / `home.css` の入力欄 | `var(--color-gray-300)` など | 枠線の色が固定 |
| `auth.css`（ログイン画面） | `var(--color-gray-100)` など | ログイン画面が白いまま |
| `layout.css` `.note-title` 付近 | `var(--color-title)` | タイトル文字が濃いグレーのまま |

そこで、**役割の名前をつけた変数を新しく追加**して、そちらを参照するように置き換えます。

```css
/* :root（ライト）に追加 */
--color-sidebar: var(--color-neutral-100);
--color-sidebar-hover: var(--color-neutral-200);

/* [data-theme="dark"] で上書き */
--color-sidebar: hsl(0, 0%, 13%);
```

```css
/* layout.css */
.sidebar {
  background-color: var(--color-sidebar);  /* ← 置き換え */
}
```

**なぜ変数を1段かませるのか**：CSS の各ファイルは「サイドバーの色」という**役割**だけを知っていればよく、具体的に何色かは `variables.css` に1か所でまとめられます。WordPress の `functions.php` で設定をまとめておき、テンプレート側は呼び出すだけにするのと似た考え方です。

### 1-3. ついでに直すバグ

`layout.css` 79行目の `rgba(var(--color-primary), 0.05)` は、`--color-primary` が `hsl(...)` 形式のため **CSS として無効**になっており、ホバー時の色が効いていません。ダークモードでも正しく動くように修正します。

### ✅ Step 1 の確認方法

`npm run dev` で開き、DevTools の Elements タブで `<html>` に `data-theme="dark"` を手で追加します。
**React のコードを1行も書いていない状態で**画面が暗くなれば、Step 1 は完了です。

---

## Step 2 🧠 あなた：テーマの state を作る

**作るファイル**：`src/modules/theme/theme.state.ts`

- Jotai の `atom` で `themeAtom` を作ります。お手本は `notes.state.ts` です
- 型は `type Theme = "light" | "dark"` のような**ユニオン型**（「この中のどれか」だけを許可する型）にします
- 初期値は、ひとまず `"light"` で大丈夫です（Step 5 で直します）

> 💭 なぜ `useState` ではなく atom なのか？
> → ボタン（SideBar）、`<html>` への反映（App）、エディタ（editor.tsx）という**別々のコンポーネント**が、同じ値を使うからです。

---

## Step 3 🧠 あなた：state を `<html>` に反映する

**触るファイル**：`src/App.tsx`

- `useAtomValue(themeAtom)` でテーマを読みます
- `useEffect` の中で、`document.documentElement`（＝ `<html>` 要素）に `data-theme` 属性をセットします
  - `setAttribute("data-theme", 値)` か `dataset.theme = 値` のどちらでも OK です
- 依存配列（`useEffect` の第2引数）に何を入れるべきか、考えてみてください

> 💭 なぜ `useEffect` なのか？
> `<html>` は、React が管理している `#root` の**外側**にあります。React の外の DOM を触る処理は「副作用」と呼ばれ、`useEffect` の中に書くのがルールです。jQuery で DOM を書き換える処理を、決まった場所に閉じ込めるイメージです。

---

## Step 4 🎨 AI ＋ 🧠 あなた：切り替えボタン

### 🎨 AI が作るもの：`src/components/SideBar/ThemeToggle.tsx`

見た目だけを担当するコンポーネントです。

```tsx
interface Props {
  theme: "light" | "dark";  // 今のテーマ（アイコンとラベルの切り替えに使う）
  onToggle: () => void;     // クリックされたときに呼ぶ関数
}
```

- `theme` に応じて 🌙 `FiMoon`「ダークモード」/ ☀️ `FiSun`「ライトモード」と表示が切り替わります
- クリックすると `onToggle()` を呼ぶだけで、**中で state は一切触りません**

このように「表示だけを担当するコンポーネント」と「ロジックを持つコンポーネント」を分ける考え方は、**Presentational / Container パターン**と呼ばれます。Liquid の snippet に変数を渡して表示させる（`{% render 'button', label: ... %}`）のに近い関係です。

### 🧠 あなたが書くもの：`SideBar/index.tsx` でつなぐ

- `useAtom(themeAtom)` で値と setter（値を更新する関数）を取り出します
- `<ThemeToggle theme={...} onToggle={...} />` を「検索」の下あたりに置きます
- `onToggle` では、setter に `prev => ...` の形（**関数型更新**：直前の値をもとに次の値を計算する書き方）で反転させた値を渡します

---

## Step 5 🧠 あなた：リロードしても維持する（永続化）

- **保存**：Step 3 の `useEffect` の中で、`localStorage.setItem("theme", theme)` も呼びます
- **読み込み**：`themeAtom` の初期値を `localStorage.getItem("theme")` から決めます
  - 初回訪問で `null` のときにどうするか、考えてみてください
  - 余裕があれば `window.matchMedia("(prefers-color-scheme: dark)").matches` を使って、OS の設定に合わせるのもおすすめです
- **発展**：`jotai/utils` の `atomWithStorage` を使うと、ここまでの処理が1行で書けます。まずは自分で書いてから置き換えると、何をしてくれているのかがよくわかります

---

## Step 6 🧠 あなた：エディタ（BlockNote）を合わせる

BlockNote は CSS 変数ではなく、独自のテーマ設定を持っています。

- `editor.tsx` で `themeAtom` を読み、`<BlockNoteView theme={...} />` に渡します
- `theme` prop には `"light"` / `"dark"` を渡せます

---

## 発展：リロード時のチラつき対策

ダークモードでリロードすると、**一瞬だけ白い画面が見える**ことがあります。

**原因**：React が起動して `useEffect` が動くまでは、`<html>` にまだ `data-theme` が付いていないため。

**対策のヒント**：`index.html` の `<head>` に小さな `<script>` を置き、React より先に `localStorage` を読んで属性を付けておきます。
（PHP で、HTML を出力する前にサーバー側で `<body class="...">` を決めておくのと似た発想です）

---

## 進め方

1. 🎨 Step 1（CSS）と Step 4（ThemeToggle の見た目）を AI が実装する
2. 🧠 Step 2 → 3 → 4（つなぎ込み）→ 5 → 6 をあなたが実装する
3. 書けたらコードを見せてもらい、AI がレビューする
