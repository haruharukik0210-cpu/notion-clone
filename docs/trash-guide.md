# ゴミ箱（論理削除）機能 手順書

## ゴール

- ノートを削除すると、DB から消えずに**ゴミ箱に移動**する
- サイドバーの「ゴミ箱」からモーダルを開き、**復元**または**完全に削除**できる
- ゴミ箱に入ったノートは、サイドバーにも検索結果にも出てこない

## 役割分担

| 担当 | 範囲 |
|---|---|
| 🎨 **AI** | UI（ゴミ箱モーダル、サイドバーのボタン、CSS）、開発環境の準備 |
| 🧠 **あなた** | ロジック（DB の設計・マイグレーション、API、フロントの state と API 呼び出し） |

今回は**バックエンド（API）も触ります**。フロントエンド中心の学習ですが、「データがどう保存されて、どう絞り込まれて画面に届くか」を一度通しで書いておくと、フロントのコードの見え方が大きく変わります。

---

## 論理削除とは？

| | 物理削除（今の実装） | **論理削除（今回作るもの）** |
|---|---|---|
| 削除したとき | `DELETE` で DB から**行を消す** | `isArchived = true` という**フラグを立てるだけ** |
| 元に戻せるか | 戻せない | フラグを `false` に戻せば復元できる |
| 一覧に出さない方法 | 行がないので自然に出ない | **取得するときに `isArchived = false` で絞り込む** |

**たとえ**：EC の管理画面で、商品を消すのではなく「**非公開**」にするのと同じです。WordPress の投稿の「ゴミ箱」も、まさにこの仕組みです（`post_status = 'trash'`）。

---

## 全体の流れ

```
[フロント]                         [API]                              [DB]
削除ボタン
  → noteRepository.archive(id)  → PATCH /notes/:id/archive       → isArchived = true（子ノートも）
ゴミ箱モーダルを開く
  → noteRepository.findTrash()  → GET /notes/trash               → isArchived = true のものだけ取得
復元ボタン
  → noteRepository.restore(id)  → PATCH /notes/:id/restore       → isArchived = false（子ノートも）
完全に削除ボタン
  → noteRepository.delete(id)   → DELETE /notes/:id（既存のまま） → 行を削除（子ノートも CASCADE で削除）
サイドバー・検索
  → noteRepository.find()       → GET /notes                     → isArchived = false のものだけ取得 ← 変更
```

---

## Step 0 🎨 AI：開発環境の準備

本番の API（`notion-clone-api-postgres`）は、すでに `~/notion講座/notion-clone-api-postgres` にダウンロード済みです。
今まで使っていた `notion-clone-api`（講座の SQLite 版）は、**今後は使いません**。

### 0-1. 開発用の DB を用意する（Neon のブランチ機能）

本番の DB を直接いじると、実験中のミスで本番のデータが壊れてしまいます。
Neon には、DB を**丸ごとコピーして別の DB を作る「ブランチ」機能**があるので、それを使います。

**たとえ**：Git のブランチの DB 版です。`production` ブランチから `development` ブランチを作ると、本番と同じ中身の**練習用 DB** ができ、何をしても本番には影響しません。

> 🙋 **ここはあなたの作業です**（Neon の画面操作）
> 1. Neon の左メニュー **Branches** → **Create branch**
> 2. Name：`development`、Parent：`production` → 作成
> 3. 作成した `development` ブランチで **Connect** → Connection pooling を**オフ**にして URL をコピー

### 0-2. API のローカル設定（AI が実施）

- `notion-clone-api-postgres/.env` を作成する（`DATABASE_URL` だけ、あなたが Neon の development ブランチの URL を貼り付けます）
- `datasource.ts` が `.env` を読み込めるようにする
  - 今のコードは、Render のように「環境変数がサーバーに直接設定されている」前提で書かれていて、ローカルの `.env` ファイルは**読み込まれる前に DB の設定が作られてしまう**順番になっています
- `npm install`

### 0-3. 作業用のブランチを切る（AI が実施）

`master` に push すると、**Vercel と Render が本番に自動でデプロイ**します。
作りかけの状態で本番に出ないように、両方のリポジトリで `feature/trash` ブランチを作って作業します。

### 0-4. ローカルの起動方法

```
ターミナル1：~/notion講座/notion-clone-api-postgres で npm run dev  → http://localhost:8888
ターミナル2：~/notion講座/notion-clone-app で npm run dev            → http://localhost:5173
```

⚠️ 古い `notion-clone-api`（SQLite 版）が起動したままだと、**ポート 8888 を取り合ってしまいます**。
新しい API が自動で 8889 番を使い、フロントは古い API（8888）につながる、という気づきにくい状態になるので、**古い方は必ず止めてください**（起動しているターミナルで `Ctrl + C`）。

---

## Step 1 🧠 あなた：DB にカラムを追加する

### 1-1. Entity にカラムを追加する

**ファイル**：`notion-clone-api-postgres/src/modules/notes/note.entity.ts`

- `isArchived` という **boolean**（true / false）のカラムを追加します
- **初期値（default）は `false`** にします。既存のノートや新しく作るノートは「ゴミ箱に入っていない」状態にしたいからです
- 書き方は、`@Column({ ... })` の中に `default: false` を指定します。他のカラムの書き方を参考にしてください

> 💭 Entity は「**TypeScript から見た** テーブルの設計図」です。
> これを書き換えただけでは、**実際の DB のテーブルは変わりません**。そこで次のマイグレーションが必要になります。

### 1-2. マイグレーションファイルを書く

**ファイル**：`src/migrations/〇〇〇〇-AddIsArchivedToNotes.ts`（新規作成）

マイグレーションとは、「**DB の構造をこう変更してください**」という手順書です。
デプロイのたびに Render が `migration:run` を実行するので、**push するだけで本番の DB にもカラムが追加**されます。

**ヒント**
- 既存の `1762400000000-Initialize.ts` が、そのままお手本になります
- ファイル名とクラス名の数字は、**今の日時のミリ秒**（JavaScript の `Date.now()` の値）を使います。既存のマイグレーションより**大きい数字**であることが大事です（数字の小さい順に実行されるため）
- `up()`：変更を**適用する** SQL。`ALTER TABLE "notes" ADD "isArchived" ...` の形になります
- `down()`：変更を**取り消す** SQL。`up()` の逆で、カラムを削除します
- SQL では、型は `boolean`、`NOT NULL`（空を許さない）、`DEFAULT false` を指定します

**たとえ**：WordPress のプラグインを更新したときに、`dbDelta()` でテーブルにカラムを追加する処理と同じ役割です。

### ✅ Step 1 の確認方法

API を起動して、ログに次のような表示が出れば成功です。

```
query: ALTER TABLE "notes" ADD "isArchived" ...
Migration AddIsArchivedToNotes〇〇〇〇 has been executed successfully.
```

Neon の **Tables** 画面（development ブランチ）で、`notes` テーブルに `isArchived` 列ができていることも確認できます。

---

## Step 2 🧠 あなた：API を変更する

**ファイル**：`notion-clone-api-postgres/src/modules/notes/note.controller.ts`

### 2-1. 一覧取得で、ゴミ箱のノートを除外する（`GET /notes`）

今の一覧取得には、**3つのケース**（キーワード検索 / 子ノート取得 / ルートノート取得）があります。
**3つすべて**に「`isArchived` が `false` のものだけ」という条件を足します。

- `find({ where: { ... } })` の形 → `where` のオブジェクトに条件を1つ追加
- `createQueryBuilder` の形（キーワード検索）→ `.andWhere(...)` を1つ追加

> 💭 1か所でも忘れると、「サイドバーには出ないのに、**検索すると出てくる**」というバグになります。

### 2-2. ゴミ箱の一覧を取得する（`GET /notes/trash`）

- ログイン中のユーザーの、`isArchived` が `true` のノートを返します
- 並び順は、**ゴミ箱に入れた順（新しい順）**がわかりやすいです。`updatedAt` の降順（`DESC`）が使えます

> ⚠️ **ルートを書く場所に注意**
> Express は、**上に書いたルートから順番に**マッチするかを調べます。
> `GET /notes/trash` を `GET /notes/:id` より**下**に書くと、`trash` が `:id` だと解釈され、`parseInt("trash")` → `NaN` でノートが見つからない、というバグになります。
> **`/trash` は `/:id` より上に書いてください。**

### 2-3. ゴミ箱に入れる（`PATCH /notes/:id/archive`）

- 既存の「ノート更新」の処理と同じく、まず**ノートの存在確認と所有者チェック**をします
- **そのノートと、すべての子孫ノート**（子・孫・ひ孫…）の `isArchived` を `true` にします

**子孫ノートを集めるヒント**

フロントの `notes.state.ts` にある `findChildrenIds` が、まさにこの処理です。それを API 側で書くイメージです。

```
対象のノート
  ├─ 子A        ← parentId が対象の id のノートを探す
  │   └─ 孫A1   ← parentId が 子A の id のノートを探す（同じ処理を繰り返す）
  └─ 子B
```

- 「ある id を親に持つノートを探す → 見つかった子それぞれについて、同じことを繰り返す」という**再帰**で書けます
- DB から探す処理は `await` が必要なので、関数は `async` にします
- まとめて更新するときは、TypeORM の `In`（`import { In } from 'typeorm'`）を使うと、`update({ id: In([1, 2, 3]) }, { ... })` のように**複数の id を一度に**更新できます

> 💭 **なぜ子孫もゴミ箱に入れるのか？**
> 親だけをゴミ箱に入れると、子ノートは `isArchived = false` のままです。
> サイドバーでは親が見えないので子も隠れますが、**検索すると子ノートだけが出てきてしまいます**。

### 2-4. 復元する（`PATCH /notes/:id/restore`）

- 2-3 の逆で、そのノートと子孫の `isArchived` を `false` にします
- 2-3 と同じ「子孫を集める処理」を使うので、**関数として切り出して共通化**するときれいです

**発展（余裕があれば）**：親がまだゴミ箱に入っているのに、子だけを復元するとどうなるでしょうか？
サイドバーは親の下に子を表示する作りなので、親が見えない以上、**子もどこにも表示されません**。
Notion では、この場合に子を**一番上の階層に移動**（`parentId = null`）して復元します。

### 2-5. 完全に削除する（`DELETE /notes/:id`）

**変更は不要です**。DB の `ON DELETE CASCADE` の設定により、子孫ノートも自動で一緒に削除されます。

### ✅ Step 2 の確認方法

フロントを作る前に、API だけで動作を確認できます。ブラウザでログインした状態で、DevTools の Console から試すのが手軽です。

```js
const token = localStorage.getItem("token");
const headers = { Authorization: `Bearer ${token}` };

// ゴミ箱に入れる（id は実在するノートに変える）
await fetch("http://localhost:8888/notes/1/archive", { method: "PATCH", headers }).then(r => r.json());

// ゴミ箱の一覧
await fetch("http://localhost:8888/notes/trash", { headers }).then(r => r.json());
```

---

## Step 3 🧠 あなた：フロントのデータ層

### 3-1. Entity に型を追加する

**ファイル**：`notion-clone-app/src/modules/notes/note.entity.ts`

- `isArchived` を追加します（API が必ず返すので、`?`（省略可能）は不要です）

### 3-2. Repository に関数を追加する

**ファイル**：`src/modules/notes/note.repository.ts`

| 関数 | 呼ぶ API | 戻り値 |
|---|---|---|
| `findTrash()` | `GET /notes/trash` | `Promise<Note[]>` |
| `archive(id)` | `PATCH /notes/:id/archive` | 自由（`Promise<void>` など） |
| `restore(id)` | `PATCH /notes/:id/restore` | 自由 |

- 既存の `find` や `delete` が、そのままお手本になります
- `delete` は、今までどおり**完全削除**に使います

---

## Step 4 🧠 あなた：削除ボタンを「ゴミ箱に入れる」に変える

**ファイル**：`src/components/NoteList/index.tsx`

- `deleteNote` の中の `noteRepository.delete(noteId)` を、`archive(noteId)` に変えます
- `noteStore.delete(noteId)` は**そのままで OK** です。ストアから消せば、サイドバーからも消えます（すでに子孫もまとめて消す作りになっています）

**改善ポイント（任意）**：今は削除すると、**どのノートを見ていても** `/`（ホーム）に戻ります。
本当に戻る必要があるのは、「**今開いているノート**（またはその親）を消したとき」だけです。`useParams` で今のノートの id を取得すると判定できます。

---

## Step 5 🎨 AI ＋ 🧠 あなた：ゴミ箱モーダル

### 🎨 AI が作るもの

**`src/components/TrashModal.tsx`**（見た目だけ）

```tsx
interface Props {
  isOpen: boolean;                  // 開いているか
  onClose: () => void;              // 閉じるとき
  notes: Note[];                    // ゴミ箱のノート一覧
  onRestore: (noteId: number) => void;  // 復元ボタン
  onDelete: (noteId: number) => void;   // 完全に削除ボタン
  onItemSelect: (noteId: number) => void; // ノート名をクリック（中身を見る）
}
```

- ノートが0件のときは「ゴミ箱は空です」と表示します
- 既存の `SearchModal` と同じ見た目の系統（`ui/dialog` を使う）にします
- 完全削除は取り消せないので、**`confirm()`（確認ダイアログ）は出さずに `onDelete` を呼ぶだけ**にします。確認を出すかどうかもロジックの判断なので、あなた側で決めてください

**サイドバーの「ゴミ箱」ボタン**
- `SideBar/index.tsx` の「ノートを作成」の下に `<Item label="ゴミ箱" icon={FiTrash2} ... />` を置きます
- `onClick` の中身は空にしておくので、あなたがつなぎます

### 🧠 あなたが書くもの

**どこに state を置くか**から考えてみてください。ヒントは、既存の**検索モーダル**です。

- 検索モーダルは、`Layout.tsx` が `isShowModal`（開閉）と `searchResult`（結果）の state を持ち、
  `SideBar` には `onSearchClick` を渡して「開く」だけをお願いしています
- ゴミ箱モーダルも、**同じ構成**で作れます

**書く処理**
1. **開く**：ゴミ箱ボタンが押されたら、`findTrash()` で一覧を取得 → state に入れる → モーダルを開く
2. **復元**：`restore(id)` → モーダルの一覧から消す → **サイドバーに戻す**
3. **完全に削除**：（確認して）`delete(id)` → モーダルの一覧から消す

**考えてみよう**
- 復元したノートを**サイドバーに戻す**には、`noteStore` に何をすればいいでしょうか？
  ヒント：`noteStore.set` は「今あるノートに追加・上書き」する関数です。復元 API が返したノート、または `findOne` で取り直したノートを渡します
- 親ごと完全に削除すると、**子孫もゴミ箱から消えます**（CASCADE）。モーダルの一覧から消すのが1件だけだと、消えたはずの子が残って見えてしまいます。
  一番シンプルな解決策は、**削除後に `findTrash()` をもう一度呼んで取り直す**ことです

---

## Step 5-2 🎨 AI ＋ 🧠 あなた：ゴミ箱の一覧に階層（パス）を表示する

### 決めたこと

- ゴミ箱の一覧は、**子孫も含めて全部並べる**（API は今のまま）
- 本家 Notion のように、各ノートの下に**親の階層**を小さく表示する

```
📄 宿の候補
   旅行の計画 / 持ち物リスト      ← 親 → そのまた親…をたどった道のり
📄 買い物メモ                     ← 親がいなければ表示しない
```

### 🎨 AI が作ったもの

`TrashModal` に、**`getPath`** という props を追加しました。

```ts
getPath?: (note: Note) => string;   // ノートを受け取って「旅行の計画 / 持ち物リスト」を返す関数
```

- 返り値が空文字（`""`）なら、2行目は表示されません
- モーダルは「関数を呼んで、返ってきた文字を表示する」だけで、**どうやって階層を調べるかは知りません**

### 🧠 あなたが書くもの：getPath の中身

**考え方**：`parentId` を手がかりに、**親 → 親の親 → …** と、親がいなくなるまでさかのぼります。

```
宿の候補（parentId: 5）
  → id 5 を探す → 持ち物リスト（parentId: 4）
  → id 4 を探す → 旅行の計画（parentId: null）→ ここで終わり

さかのぼった順：持ち物リスト、旅行の計画
表示する順    ：旅行の計画 / 持ち物リスト   ← 逆順にする
```

**ヒント**

1. **親をどこから探すか**：親は2か所のどちらかにいます
   - ゴミ箱の一覧（`trashNotes`）… 親も一緒にゴミ箱に入っている場合
   - サイドバーのストア（`noteStore.getAll()`）… 親はゴミ箱に入っていない場合
   - 2つの配列を `[...a, ...b]` でつなげて、その中から `find` で探すと簡単です
2. **繰り返し方**：`while (current.parentId != null)` のループで、親を見つけたら `current` を親に置き換えて、さらにさかのぼります
   - 親が見つからなかったら `break` で抜けます（無限ループ防止）
3. **並べ方**：見つけた順に `unshift`（配列の先頭に追加）すると、自然に「上の階層 → 下の階層」の順になります。最後に `join(" / ")` でつなげます

> 💭 Step 2 の `findDescendantIds` は「**下に**たどる（子孫を集める）」処理でした。今回は「**上に**たどる（祖先を集める）」処理です。向きが逆なだけで、考え方は同じです。

### ⚠️ 知っておきたい制約

サイドバーのストア（`noteStore`）には、**画面に読み込んだノートしか入っていません**。リロード直後は一番上の階層のノートだけで、▶ で開いた子ノートが追加されていきます。

そのため、「**ゴミ箱に入っていない親**が、まだストアに読み込まれていない」場合、階層が途中までしか表示されないことがあります。

- ポートフォリオとしては、まずこのままで OK
- 正確にしたい場合の方法（発展）
  - 見つからない親を `noteRepository.findOne(parentId)` で取りに行く
  - API のゴミ箱一覧で、階層（パス）も一緒に返すようにする

---

## Step 6 🎨 AI ＋ 🧠 あなた：ゴミ箱のノートを開いたときのバナー

### 進め方（今回から）

```
① 本家を触る → ② 操作シナリオ表 → ③ props を決める（あなた）→ ④ UI（AI）→ ⑤ ロジック（あなた）
```

### ① 本家 Notion の動き

本家でゴミ箱のページを開くと、ページの上部に**赤い帯（バナー）**が表示されます。

- 「このページはゴミ箱にあります」というメッセージ
- 「ページを復元」「完全に削除」の2つのボタン
- 本文は**編集できない**（読み取り専用）

💡 実際に本家のゴミ箱からページを開いて、見比べてみてください。

### 画面のイメージ

```
┌──────────────────────────────────────────────────────┐
│ 🗑 このノートはゴミ箱にあります      [復元]  [完全に削除] │  ← 赤っぽい帯（画面上部）
└──────────────────────────────────────────────────────┘

   旅行の計画                                             ← いつものタイトル
   ・パスポート                                           ← いつもの本文
```

### ② 操作シナリオ表（たたき台）

| 操作・状況 | 画面はどうなる？ | 裏で何が起きる？ |
|---|---|---|
| ゴミ箱モーダルからノートを開く | 上部にバナーが出る | `note.isArchived` が `true` なのでバナーを表示 |
| 普通のノートを開く | バナーは出ない | `isArchived` が `false` |
| バナーの「復元」を押す | **バナーが消える**。サイドバーに戻る。ページはそのまま | 復元 API → 返ってきたノートでストアを更新 |
| バナーの「完全に削除」を押す | 確認 → OK ならホーム（`/`）へ移動 | 削除 API → ストアから外す → `navigate("/")` |
| （ゴミ箱のノートを編集した） | ？（下の「決めること B」） | ？ |
| （ゴミ箱のノートを開いているとき、サイドバーは？） | **そのノートはサイドバーに出ない**べき | ⚠️ 下の「見つけた問題」を参照 |

### ⚠️ シナリオ表を書いていて見つけた問題

今の `NoteDetail.tsx` は、ノートを開くと `findOne` で取得したノートを **`noteStore.set([note])`** でストアに入れています。

```ts
const note = await noteRepository.findOne(id);
noteStore.set([note]);   // ← ゴミ箱のノートでもストアに入る
```

そして `NoteList` は、ストアのノートを **`parentId` だけ**で絞り込んで表示しています。

```ts
notes.filter((note) => (note.parentId ?? undefined) === (parentId ?? undefined))
```

つまり、**ゴミ箱のノートを開くと、サイドバーにそのノートが表示されてしまいます**（ゴミ箱にあるのに！）。

**直し方の候補（🧠 あなたが選ぶ）**

| 案 | やること | 良いところ | 気になるところ |
|---|---|---|---|
| A | `NoteList` の `filter` に「`isArchived` ではないもの」という条件を足す | 1か所の変更で、どこからストアに入っても出なくなる | ストアにゴミ箱のノートが混ざったままになる |
| B | `NoteDetail` で、ゴミ箱のノートはストアに入れず、別の state で持つ | ストアには「サイドバーに出すもの」だけが入る | NoteDetail の作りが少し複雑になる |

**おすすめは A** です。「サイドバーに表示するのは、ゴミ箱に入っていないものだけ」というルールを、**表示する側（NoteList）で1回だけ守れば済む**ので、確実です。

### ③ 決めること（props の案）

#### 決めること A：バナーの props

新しく `ArchivedBanner.tsx`（バナー）を作ります。

**案1：ボタンが押されたことだけを伝える（おすすめ）**

```ts
interface Props {
  onRestore: () => void;
  onDelete: () => void;
}
```

**案2：ノートの id も一緒に伝える（TrashModal と同じ形）**

```ts
interface Props {
  noteId: number;
  onRestore: (noteId: number) => void;
  onDelete: (noteId: number) => void;
}
```

| | 案1 | 案2 |
|---|---|---|
| 考え方 | バナーは「**今開いているノート**」専用。どのノートかは親（NoteDetail）が知っている | TrashModal とそろえる。どのノートかをバナーも知っている |
| 親での書き方 | `onRestore={() => restoreNote(note.id)}` | `noteId={note.id} onRestore={restoreNote}` |
| props の数 | 少ない | 1つ多い |

TrashModal は「**たくさんのノートの中から1つ**」を選ぶので、id を渡す必要がありました。バナーは「**常に今のノート1つ**」なので、id を渡さなくても親がわかっています。この違いから、**案1**をおすすめします。

#### 決めること B：ゴミ箱のノートは編集できるようにする？

| | 編集できる（今のまま） | 編集できない（本家と同じ） |
|---|---|---|
| 実装 | 何もしなくていい | タイトルとエディタを読み取り専用にする必要がある |
| 使い勝手 | 消したつもりのノートを、うっかり書き換えられる | 「復元してから編集」というルールがはっきりする |

まずは**編集できるまま**で進めて、余裕があれば読み取り専用にする、でも十分です。

### ④ 🎨 AI が作るもの（props が決まったら）

- `src/components/ArchivedBanner.tsx`（見た目だけ）
- 必要な CSS（ダークモードでも見やすい色）

### ⑤ 🧠 あなたが書くもの

1. **サイドバーの問題を直す**（上の A か B）
2. `NoteDetail.tsx` で、`note.isArchived` が `true` のときだけバナーを表示する
   - JSX の中で条件によって表示を切り替えるには、`{条件 && <コンポーネント />}` の形が使えます（TrashModal の `{path && ...}` と同じ）
3. **復元**：`restore(note.id)` → 返ってきたノートを `noteStore.set([...])` に渡す
   - 返ってきたノートは `isArchived: false` なので、ストアのノートが上書きされて、**バナーが自動で消える**（state が変わると画面が描き直されるため）
4. **完全に削除**：`confirm` → `delete(note.id)` → `noteStore.delete(note.id)` → `navigate("/")`

---

## Step 7：本番に出す

**順番が大事です。API → フロントの順**でデプロイします。

```
① API（notion-clone-api-postgres）を master にマージして push
   → Render が再デプロイ → migration:run で本番の DB に isArchived カラムが追加される
② 本番の API が動いていることを確認
③ フロント（notion-clone-app）を master にマージして push → Vercel が再デプロイ
```

**なぜこの順番？**
- 先にフロントを出すと、フロントは `/notes/:id/archive` を呼ぶのに、API にはまだそのルートがない → **削除ボタンが壊れる**
- 先に API を出しても、古いフロントは `DELETE /notes/:id` を呼ぶだけなので、**今まで通り動く**

このように「**新しい API は、古いフロントでも動くように作る**」ことを**後方互換性**といい、実務でとても大切な考え方です。

### マージの方法：GitHub の Pull Request（PR）を使う

`feature/trash` → `master` に取り込む（マージする）方法はいくつかありますが、**GitHub の Pull Request（プルリクエスト）**を使います。

- **Pull Request**：「このブランチの変更を、master に取り込んでください」というお願いを GitHub 上に作るもの。変更されたファイルの一覧と差分（どこが変わったか）を、マージ前に画面で確認できる
- 個人開発でも PR を使っておくと、**GitHub に「何を・なぜ変えたか」の記録が残る**ので、ポートフォリオとしても見栄えが良い

### 手順

#### 0. フロントの残りの変更を commit・push する（Sourcetree）

- `notion-clone-app` を開き、`feature/trash` になっていることを確認
- **`?` のファイル（ArchivedBanner.tsx、archived-banner.css）も含めて**、すべてにチェックを入れて commit → push

#### 1. API の PR を作ってマージする（GitHub）

1. GitHub で `notion-clone-api-postgres` を開く
2. 上部に「**feature/trash had recent pushes**」と出ていれば **Compare & pull request**（出ていなければ **Pull requests → New pull request**）
3. **base: `master`** ← **compare: `feature/trash`** になっていることを確認
4. タイトルと説明を書く（例は下）→ **Create pull request**
5. **Files changed** タブで、変更内容を確認する（`.env` が入っていないこと、マイグレーションファイルがあること）
6. **Merge pull request** → **Confirm merge**

```
タイトル：ゴミ箱（論理削除）機能のAPIを追加

## 変更内容
- notes テーブルに isArchived 列を追加（マイグレーション）
- 一覧・検索でゴミ箱のノートを除外
- GET /notes/trash、PATCH /notes/:id/archive、PATCH /notes/:id/restore を追加
- ローカル開発用に datasource.ts で .env を読み込むよう変更
```

#### 2. Render のデプロイと本番 API を確認する

- マージすると、Render が**自動でデプロイ**を始める（`master` への commit がきっかけ）
- デプロイログに次の表示が出れば成功

```
query: ALTER TABLE "notes" ADD "isArchived" boolean NOT NULL DEFAULT false
Migration AddIsArchivedToNotes1792663961612 has been executed successfully.
==> Your service is live 🎉
```

- この時点では、本番のフロントは古いままだが、**今まで通り動く**（後方互換性）

#### 3. フロントの PR を作ってマージする（GitHub）

- `notion-clone`（フロント）で、1 と同じ手順
- マージすると、Vercel が**自動で本番にデプロイ**する

#### 4. 本番で動作確認する

- [ ] ノートを削除 → サイドバーから消える
- [ ] ゴミ箱を開く → 一覧と階層が表示される
- [ ] 復元 → サイドバーに戻る（子孫も）
- [ ] ゴミ箱のノートを開く → バナーが出て、編集できない
- [ ] 完全に削除 → 確認が出て、消える
- [ ] ダークモードでも見た目に問題がない

#### 5. ローカルを master に戻す（Sourcetree）

マージしたのは GitHub 上の `master` なので、**ローカルの `master` はまだ古い**まま。

1. 左のブランチ一覧の **`master` をダブルクリック**（チェックアウト）
2. 上の **プル** → `master` を選んで OK（GitHub の最新の master をローカルに取り込む）
3. 両方のリポジトリで行う
4. （任意）使い終わった `feature/trash` ブランチは、右クリック → 削除してよい

### 万が一、本番で問題が起きたら

- **フロント**：Vercel の Deployments から、**前のデプロイに戻す**（Promote / Instant Rollback）ことができる
- **API**：今回のマイグレーションは「列を追加するだけ」なので、古いコードに戻しても**列が余分にあるだけで動く**。慌てて DB を戻す必要はない

---

## 進め方

1. 🎨 AI：Step 0（環境準備）→ あなたが Neon で development ブランチを作る
2. 🧠 あなた：Step 1 → 2（API）→ 3 → 4（フロントのデータ層）
3. 🎨 AI：Step 5 の UI（モーダル・サイドバーのボタン）
4. 🧠 あなた：Step 5 のつなぎ込み →（任意で Step 6）
5. AI がレビュー → Step 7 で本番へ

💼 **ポートフォリオでのアピール**：「論理削除」「再帰による子孫ノートの一括更新」「後方互換性を意識したデプロイ順」は、EC の受注・商品データの扱いとも共通する、**実務的なデータ設計**の話題です。README に書いておくと、面接で話を広げやすくなります。
