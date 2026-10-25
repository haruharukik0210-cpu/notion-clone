# DB 移行 手順書（Render PostgreSQL → Neon）

## なぜ移行するのか

Render の無料 PostgreSQL は、**作成から30日で期限切れ**になり、さらに14日の猶予期間を過ぎると**データごと削除**されます。
ポートフォリオとして長く公開し続けるために、**期限のない無料枠がある Neon** に移行します。

| サービス | 無料枠の特徴 |
|---|---|
| Render PostgreSQL | 30日で期限切れ → 削除 |
| **Neon（今回の移行先）** | 期限なし。容量 0.5GB。使われていないと自動で休止し、アクセスがあると数秒で復帰する |
| Supabase | 期限なし。ただし1週間アクセスがないとプロジェクトが一時停止し、手動で再開する必要がある |

ポートフォリオは「しばらく誰も見ない → 面接官が突然開く」という使われ方をするので、**自動で復帰する Neon** が向いています。

---

## 全体の流れ

```
① Neon で新しい DB を作る                    … あなた（アカウント作成）
② Render の DB からデータを取り出す（pg_dump）  … あなた（コマンド実行）
③ Neon の DB にデータを入れる（psql）          … あなた（コマンド実行）
④ Render の API の接続先を Neon に切り替える    … あなた（Render の画面）
⑤ 本番で動作確認                              … あなた＋AI
⑥ 古い Render の DB を削除する                … あなた（確認後）
```

**たとえ**：WordPress のサーバー引っ越しと同じです。
「旧サーバーの MySQL をエクスポート（②）→ 新サーバーにインポート（③）→ `wp-config.php` の DB 接続先を書き換える（④）」という流れで、API のコード自体は変更しません。

> 💡 **データを引き継がない場合**は ②③ を飛ばせます。
> API は起動時に `migration:run` を実行する設定なので、空の Neon に接続するだけで**テーブルは自動で作られます**。
> ただし、本番のユーザーとノートはすべて消えるので、ログインし直し（新規登録）が必要です。

---

## 🔐 パスワードの扱い（最重要）

この手順では、**DB のパスワードを含む接続 URL** を何度か扱います。

- 接続 URL は**チャットや GitHub に貼らない**（AI にも送らない）
- ターミナルで使うときは、**環境変数に入れてから使う**（コマンド履歴にパスワードを残しにくくするため）
- 貼る必要があるときは、`:` と `@` の間を `***` に置き換える

```
postgresql://ユーザー名:***@ホスト名/DB名
```

---

## ① Neon で DB を作る

1. https://neon.tech にアクセスし、**GitHub アカウントでサインアップ**する
2. 新しいプロジェクトを作成する
   - **Project name**：`notion-clone`
   - **Postgres version**：一番新しいもの（初期値のままで OK）
   - **Region**：**`AWS US West 2 (Oregon)`**
     → Render の API がオレゴンにあるので、**同じ地域**にすると通信が速くなります
3. 作成後に表示される **Connection string** をコピーし、メモ帳などに一時的に保存する
   - `postgresql://〜@ep-〜.us-west-2.aws.neon.tech/neondb?sslmode=require` のような形です
   - **「Pooled connection」のチェックは外した**ものをコピーしてください（理由は ③ の補足を参照）

---

## ② Render からデータを取り出す（バックアップ）

### 2-1. ツールを用意する

データの取り出しには `pg_dump`、取り込みには `psql` というコマンドを使います。
Mac には PostgreSQL 15 のものが入っていますが、**Render の DB の方がバージョンが新しい**場合、古い `pg_dump` は使えません。
そこで、最新のクライアントツールだけをインストールします（DB サーバー本体はインストールされません）。

```bash
brew install libpq
```

インストール後、バージョンを確認します（17 以上なら OK）。

```bash
/opt/homebrew/opt/libpq/bin/pg_dump --version
```

### 2-2. Render の接続 URL を用意する

Render の PostgreSQL → **Info** → **External Database URL** をコピーします。

> ⚠️ API の `DATABASE_URL` に入っているのは **Internal**（Render の中からだけ使える URL）です。
> 自分の Mac から接続するには、**External** の方が必要です。

> ⚠️ Render の画面で DB が見つからない場合は、API の `DATABASE_URL` のホスト名
> `dpg-〜-a.oregon-postgres.render.com` がすでに External 形式なので、それを使えます。

### 2-3. 取り出す

ターミナルで、まず接続 URL を環境変数に入れます（`'...'` の中に貼り付けます）。

```bash
export RENDER_DB_URL='ここに Render の External Database URL'
```

データを `backup.sql` というファイルに書き出します。

```bash
/opt/homebrew/opt/libpq/bin/pg_dump "$RENDER_DB_URL" --no-owner --no-acl -f ~/notion-backup.sql
```

| オプション | 意味 |
|---|---|
| `--no-owner` | 「このテーブルの持ち主は Render のユーザー」という情報を書き出さない（Neon には同じユーザーがいないため） |
| `--no-acl` | 権限の設定を書き出さない（同上） |
| `-f` | 書き出すファイルの名前 |

✅ **確認**：`~/notion-backup.sql` ができていて、中に `CREATE TABLE` や `COPY public.notes` などの文字があれば成功です。
このファイルは**本番データのバックアップ**なので、移行が終わるまで消さないでください（GitHub には上げないでください）。

---

## ③ Neon にデータを入れる

```bash
export NEON_DB_URL='ここに Neon の Connection string'
```

```bash
/opt/homebrew/opt/libpq/bin/psql "$NEON_DB_URL" -f ~/notion-backup.sql
```

✅ **確認**：テーブルとデータが入ったかを確認します。

```bash
/opt/homebrew/opt/libpq/bin/psql "$NEON_DB_URL" -c 'SELECT count(*) FROM notes;'
```

Render 側と同じ件数が出れば成功です。`migrations` テーブルもコピーされるので、API は「マイグレーションは実行済み」と正しく判断できます。

> 💭 **なぜ Pooled connection を使わないのか？**
> Neon の「Pooled」は、たくさんの接続を効率よくさばくための中継役を通る URL です。
> 便利な反面、`pg_dump` や TypeORM のマイグレーションのように**1つの接続で長い処理をするもの**とは相性が悪いことがあります。
> このアプリは利用者が少ないので、中継なしの**直接接続**で十分です。

---

## ④ API の接続先を Neon に切り替える

1. Render の API（Web Service）→ **Environment**
2. **`DATABASE_URL`** を **Neon の Connection string** に書き換えて保存
3. 同じ画面で **`NODE_ENV`** が **`production`** になっているか確認する
   - API の `datasource.ts` は、`NODE_ENV === 'production'` のときだけ SSL（暗号化通信）を有効にする作りになっています
   - Neon は **SSL が必須**なので、これがないと接続に失敗します
4. 保存すると、自動で再デプロイが始まります

✅ **確認**：デプロイログに次の表示が出れば成功です。

```
No migrations are pending
✓ Server successfully started!
==> Your service is live 🎉
```

---

## ⑤ 本番で動作確認

Vercel の本番サイトで、次を確認します。

- [ ] ログインできる（既存のアカウントで）
- [ ] 既存のノートが表示される
- [ ] 新しいノートを作成・編集・削除できる
- [ ] ダークモードの切り替えも問題ない

---

## ⑥ 古い Render の DB を削除する

⑤ がすべて OK で、**数日問題なく使えた**ことを確認してから削除します。

1. Render の PostgreSQL → **Settings** → **Delete Database**
2. 手元の `~/notion-backup.sql` も、不要になったら削除する

削除すると、以前チャットに貼ってしまった**古いパスワードも完全に無効**になります。
（DB が画面で見つからない場合でも、30日＋14日後には自動で削除されます）

---

## 困ったときは

| 症状 | 原因の候補 |
|---|---|
| `pg_dump: error: aborting because of server version mismatch` | 古い `pg_dump` を使っている → 2-1 の libpq 版のパス（`/opt/homebrew/opt/libpq/bin/...`）で実行しているか確認 |
| `psql` で `role "〜" does not exist` | `pg_dump` に `--no-owner --no-acl` を付け忘れている → ② をやり直す |
| デプロイ後に `connection is insecure` / SSL のエラー | `NODE_ENV=production` が設定されていない → ④-3 を確認 |
| 最初のアクセスだけ遅い | Neon と Render の無料プランが休止から復帰している。正常な動作です |

エラーが出たら、**接続 URL（パスワード）を含まない部分**のエラーメッセージを AI に見せてください。
