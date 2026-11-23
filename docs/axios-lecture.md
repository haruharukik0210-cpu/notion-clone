# axios とインターセプターの講義

インターセプターを書けるようになるために、土台から順に積み上げます。

| 章 | 内容 |
| --- | --- |
| 1 | Promise のおさらい（axios は Promise を返す） |
| 2 | axios が返すもの：成功（response）と失敗（error）の形 |
| 3 | axios の基本の書き方 |
| 4 | インターセプターの正体：「`then` を全部のリクエストに自動で付ける」 |
| 5 | リクエストのインターセプターを読む |
| 6 | レスポンスのインターセプターの書き方 |
| 7 | 型の付け方 |
| 8 | 練習問題（3 つ） |
| 9 | よくあるまちがい |

---

## 1. Promise のおさらい

axios の関数（`api.get` など）は、すぐに結果を返しません。**「あとで結果が入る箱」＝ Promise** を返します。

> **たとえ**：レストランで注文すると、料理ではなく**呼び出しベル**を渡されます。ベルが鳴ったら（成功）料理を取りに行きます。鳴らずに「売り切れです」と言われたら（失敗）、別の対応をします。

| 状態 | 意味 | ベルでたとえると |
| --- | --- | --- |
| pending（待ち） | まだ結果が出ていない | ベルを持って待っている |
| fulfilled（成功） | 結果が出た | ベルが鳴った |
| rejected（失敗） | 失敗した | 「売り切れです」 |

### 結果の受け取り方は 2 通り

```ts
// ① async / await（このアプリで主に使っている書き方）
try {
  const result = await api.get("/notes"); // 成功するまで、ここで待つ
  console.log(result.data);
} catch (error) {
  console.log("失敗", error);               // 失敗したら、ここに来る
}

// ② then / catch（インターセプターの中身は、こちらの考え方で動いている）
api.get("/notes")
  .then((result) => console.log(result.data)) // 成功したら
  .catch((error) => console.log("失敗", error)); // 失敗したら
```

①と②は、**同じことを別の書き方で書いている**だけです。インターセプターを理解するには、②の `then` の考え方が大事です。

### `then` の大事な決まりごと（4 章で使う）

| `then` に渡した関数の中で | 次に起きること |
| --- | --- |
| 値を `return` した | その値が、次の `then`（または `await` の結果）に渡る |
| 何も `return` しなかった | **`undefined`** が次に渡る |
| `throw` した、または `Promise.reject(…)` を返した | 次の `catch`（または `try` / `catch` の `catch`）に飛ぶ |

---

## 2. axios が返すもの

### 成功したとき：response（返事）

`await api.get("/notes")` の結果は、返事の中身だけでなく、**返事全体の情報**が入ったオブジェクトです。

| プロパティ | 中身 | 例 |
| --- | --- | --- |
| `data` | **返事の中身**（JSON を変換したもの） | `{ notes: [ … ] }` |
| `status` | ステータスコード | `200` |
| `headers` | 返事のヘッダー | |
| `config` | 送ったときの設定 | URL・メソッドなど |

このアプリのリポジトリが、いつも `result.data` と書いているのは、このためです。

### 失敗したとき：error

400 番台・500 番台、または通信そのものの失敗は、`catch` に **error** が届きます。

| プロパティ | 中身 | 例 |
| --- | --- | --- |
| `response` | 返事があれば、上と同じ形の返事。**通信そのものが失敗したときは `undefined`** | |
| `response.status` | ステータスコード | `401`・`500` |
| `response.data` | 返事の中身 | `{ message: "ログインが必要です" }` |
| `config` | 送ったときの設定 | |
| `config.url` | 送った先 | `"/notes"`・`"auth/signin"` |
| `config.method` | メソッド | `"get"`・`"post"` |
| `message` | エラーの説明（英語） | `"Request failed with status code 401"` |

> **`response` がないのはどんなとき？**：サーバーが落ちている、ネットがつながっていない、などで**返事そのものが来なかった**ときです。だから `error.response.status` ではなく、`error.response?.status` と書きます（`?.` はオプショナルチェーン。`response` がなければ、そこで止めて `undefined` にする）。

---

## 3. axios の基本の書き方

### 3-1. そのまま使う

```ts
import axios from "axios";

const result = await axios.get("https://example.com/notes");
```

毎回、URL を全部書く必要があります。

### 3-2. `axios.create` で「専用の axios」を作る（このアプリの書き方）

```ts
const api = axios.create({ baseURL: "https://example.com" });

const result = await api.get("/notes"); // → https://example.com/notes に送られる
```

`axios.create` は、**設定を覚えた axios のコピー**を作ります。このアプリでは `src/lib/api/index.ts` で作って、`export default api` しています。リポジトリはどれも、この `api` を使っています。

> **たとえ（Liquid）**：`{% render 'product-card', product: product %}` の部品に、毎回同じ値を渡す代わりに、最初から値を覚えた部品を用意しておくイメージです。

### 3-3. メソッドごとの書き方

| 書き方 | 第 2 引数 |
| --- | --- |
| `api.get(url)` | なし（送る中身がない） |
| `api.post(url, 送る中身)` | 送る中身（オブジェクト） |
| `api.patch(url, 送る中身)` | 同上 |
| `api.delete(url)` | なし |

---

## 4. インターセプターの正体

インターセプターは、**全部のリクエストに、自動で `then` を付ける仕組み**です。

### インターセプターがないとき

```ts
const result = await api.get("/notes");
```

### レスポンスのインターセプターを登録すると、こう動く

```ts
const result = await api.get("/notes")
  .then(
    成功したときの関数,   // ← 登録した 1 つ目
    失敗したときの関数,   // ← 登録した 2 つ目
  );
```

`then` には、実は関数を **2 つ**渡せます。1 つ目が成功したとき、2 つ目が失敗したときに呼ばれます。

`api.interceptors.response.use(1つ目, 2つ目)` は、この `then` を、**このアプリの全部の API 呼び出しに自動で差し込む**ための書き方です。

### だから、1 章の決まりごとがそのまま当てはまる

| インターセプターの関数の中で | 呼び出し元（SideBar など）で起きること |
| --- | --- |
| 成功の関数で `response` を `return` | `await` の結果として `response` が届く（いつもどおり） |
| 成功の関数で **何も `return` しない** | `await` の結果が **`undefined`** になる → `result.data` でエラー |
| 失敗の関数で `return Promise.reject(error)` | 呼び出し元の `catch` に `error` が届く（いつもどおり） |
| 失敗の関数で **何も `return` しない** | `undefined` を返した＝**成功したことになる** → `catch` に入らない |

**インターセプターの関数は、「何を返すか」で、呼び出し元に届くものが決まります**。ここが一番大事です。

---

## 5. リクエストのインターセプターを読む

今あるもの（`src/lib/api/ interceptors/request.ts`）です。

```ts
export const addAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (!token) return config;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
};
```

| 行 | 意味 |
| --- | --- |
| 引数 `config` | **これから送る**リクエストの設定（URL・ヘッダーなど） |
| `if (!token) return config;` | トークンがなければ、何も足さずにそのまま返す |
| `config.headers.Authorization = …` | ヘッダーにトークンを書き足す |
| `return config;` | 「この設定で送って」と axios に返す |

登録は `src/lib/api/index.ts` です。

```ts
api.interceptors.request.use(addAuthorizationHeader);
```

| ポイント | 中身 |
| --- | --- |
| 関数を別のファイルに書いて、export する | 中身が長くなっても、`index.ts` が読みやすいまま |
| `use` には関数を**渡すだけ**（`()` を付けない） | `addAuthorizationHeader()` と書くと、その場で 1 回呼ばれてしまう。渡すのは関数そのもの |

> **たとえ（JS）**：`button.addEventListener("click", handleClick)` で、`handleClick()` と書かないのと同じです。

---

## 6. レスポンスのインターセプターの書き方

### 6-1. いちばん小さい形（何もしない）

```ts
api.interceptors.response.use(
  (response) => response,                // 成功：そのまま返す
  (error) => Promise.reject(error),      // 失敗：そのまま失敗として返す
);
```

これは、**登録しても何も変わらない**形です。まずこれが書けて、アプリがいつもどおり動けば、土台はできています。

> `(response) => response` は、`(response) => { return response; }` の省略形です（アロー関数で `{ }` を書かないと、その値がそのまま返る）。

### 6-2. 中身を足す例：失敗したときにログを出す

```ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("失敗した URL：", error.config?.url);
    console.log("ステータス：", error.response?.status);
    return Promise.reject(error); // 最後に必ず、失敗として返す
  },
);
```

`{ }` を書いたら、`return` も自分で書く必要があります。

### 6-3. 別のファイルに分ける

リクエストのインターセプターと同じ形にそろえます。

```ts
// src/lib/api/ interceptors/response.ts
export const 名前 = (error: …) => {
  …
  return Promise.reject(error);
};

// src/lib/api/index.ts
import { 名前 } from "./ interceptors/response";
api.interceptors.response.use((response) => response, 名前);
```

成功のほうは何もしないので、`index.ts` にその場で書いて大丈夫です。

> **フォルダ名の注意**：今のフォルダ名は `" interceptors"`（先頭に**半角スペース**）になっています。import のパスも、スペースを入れて書く必要があります。あとで名前を直すのがおすすめです（リストの 7「小さな修正」に入れておきます）。

---

## 7. 型の付け方

| 何の型 | 型の名前 | 読み込み |
| --- | --- | --- |
| リクエストの設定 | `InternalAxiosRequestConfig` | `import type { InternalAxiosRequestConfig } from "axios"` |
| 成功したときの返事 | `AxiosResponse` | `import type { AxiosResponse } from "axios"` |
| 失敗したときのエラー | `AxiosError` | `import type { AxiosError } from "axios"` |

```ts
import type { AxiosError } from "axios";

export const logError = (error: AxiosError) => {
  console.log(error.response?.status); // 型を付けると、response や config を補完してくれる
  return Promise.reject(error);
};
```

型を付けると、VS Code で `error.` と打ったときに候補が出ます。書きまちがいにも気づけます。

---

## 8. 練習問題

本番のコードに入れる前に、手元で試してください。どれも `npm run dev` でアプリを開き、開発者ツールの「Console」で確かめます。

### 練習 1：何もしないインターセプター

6-1 の形を、`src/lib/api/index.ts` に書いてください。

| 確かめること | 期待する結果 |
| --- | --- |
| ログインして、ノートが表示される | いつもどおり動く |

できたら、成功の関数を `(response) => {}` に変えてみてください。何が起きるか、1 章と 4 章の表で説明できれば OK です（確かめたら元に戻す）。

### 練習 2：すべての返事のステータスを表示する

成功したときも失敗したときも、`console.log` でステータスコードを表示してください。

| 確かめること | 期待する結果 |
| --- | --- |
| ノート一覧を開く | Console に `200` |
| ノートを作る | `201` |
| ログイン画面で、パスワードをまちがえる | `401` |

### 練習 3：別のファイルに分ける

練習 2 の「失敗したとき」の関数を、`response.ts` に移して export し、`index.ts` で import して登録してください。型（`AxiosError`）も付けます。

| 確かめること | 期待する結果 |
| --- | --- |
| `npx tsc -b` | エラーなし |
| 練習 2 と同じ操作 | 同じ結果 |

練習 3 までできれば、本番の課題（401 ならログイン画面へ）は、**失敗したときの関数の中身を変えるだけ**です。

---

## 9. よくあるまちがい

| まちがい | 起きること | 直し方 |
| --- | --- | --- |
| 成功の関数で `return` を忘れる | 全部の API 呼び出しで `result` が `undefined` になり、`result.data` でエラー | `(response) => response` |
| 失敗の関数で `return Promise.reject(error)` を忘れる | 失敗したのに「成功」扱いになり、画面の `catch` が動かない | 最後に必ず `return Promise.reject(error)` |
| `error.response.status` と書く | 通信そのものが失敗したとき（`response` がない）に、インターセプターの中でエラーになる | `error.response?.status` |
| `use(関数())` と `()` を付ける | 登録のときに 1 回呼ばれてしまい、関数ではなく結果が登録される | `use(関数)` |
| `{ }` を書いたのに `return` がない | アロー関数で `{ }` を書くと、自動では返らない | `return` を書く、または `{ }` をやめる |
