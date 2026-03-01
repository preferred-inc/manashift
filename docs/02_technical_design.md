# Manashift — 技術設計書

**バージョン:** 1.0  
**作成日:** 2026-03-02

---

## 1. システム構成

Manashiftは、React + Express + tRPC によるフルスタックWebアプリケーションとして構築されている。フロントエンドとバックエンドは同一プロセスで動作し、Viteの開発サーバーがプロキシとして機能する。

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React 19)                 │
│  React Query + tRPC Client → type-safe API calls     │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS / tRPC over HTTP
┌─────────────────────────▼───────────────────────────┐
│              Express Server (Node.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  tRPC Router │  │  Manus OAuth │  │  Static   │  │
│  │  /api/trpc   │  │  /api/oauth  │  │  Assets   │  │
│  └──────┬───────┘  └──────────────┘  └───────────┘  │
│         │                                            │
│  ┌──────▼───────────────────────────────────────┐   │
│  │              Drizzle ORM                      │   │
│  └──────┬────────────────────────────────────────┘  │
└─────────┼───────────────────────────────────────────┘
          │
┌─────────▼──────────┐   ┌──────────────────────────┐
│   MySQL (TiDB)     │   │   Built-in AI APIs        │
│   7 tables         │   │   ├─ LLM (Gemini)         │
└────────────────────┘   │   └─ Image Generation     │
                         └──────────────────────────┘
```

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン | 役割 |
| :--- | :--- | :--- | :--- |
| **フロントエンド** | React | 19 | UIフレームワーク |
| | TypeScript | 5.9 | 型安全 |
| | Tailwind CSS | 4 | スタイリング |
| | shadcn/ui | latest | UIコンポーネント |
| | Wouter | 3.3 | クライアントルーティング |
| | TanStack Query | 5 | サーバー状態管理 |
| **バックエンド** | Express | 4 | HTTPサーバー |
| | tRPC | 11 | 型安全RPC |
| | Drizzle ORM | 0.44 | DBアクセス |
| **データベース** | MySQL (TiDB) | - | リレーショナルDB |
| **AI** | Built-in LLM API | - | テキスト生成（Gemini） |
| | Built-in Image API | - | カバー画像生成 |
| **認証** | Manus OAuth | - | ユーザー認証 |
| **ビルド** | Vite | 7 | フロントエンドバンドラー |
| | esbuild | 0.25 | サーバーバンドラー |

---

## 3. データベース設計

### 3.1. テーブル一覧

```
users          ← ユーザー情報（OAuth連携）
contents       ← 生成コンテンツ（メインテーブル）
tags           ← タグマスタ
contentTags    ← コンテンツ↔タグの中間テーブル
likes          ← いいね
comments       ← コメント
bookmarks      ← ブックマーク
```

### 3.2. contentsテーブル（主要カラム）

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | INT PK | 自動採番 |
| `userId` | INT | 作成者（usersテーブル参照） |
| `title` | VARCHAR(255) | コンテンツタイトル |
| `description` | TEXT | 説明文 |
| `sourceText` | TEXT | 変換元テキスト |
| `outputFormat` | ENUM | `novel` / `manga` / `flashcard` / `video_script` / `poem` |
| `outputData` | TEXT | 生成結果（JSON文字列） |
| `coverImageUrl` | TEXT | AIが生成したカバー画像URL |
| `isPublic` | BOOLEAN | 公開/非公開フラグ |
| `status` | ENUM | `pending` / `generating` / `completed` / `failed` |
| `viewCount` | INT | 閲覧数 |
| `likeCount` | INT | いいね数（非正規化カウンタ） |
| `commentCount` | INT | コメント数（非正規化カウンタ） |

### 3.3. outputDataのJSONスキーマ

各フォーマットの `outputData` は以下の構造を持つ。

**Novel:**
```json
{
  "chapters": [
    { "title": "第一章", "content": "..." }
  ]
}
```

**Manga:**
```json
{
  "panels": [
    { "panelNumber": 1, "description": "...", "dialogue": "...", "imageUrl": "..." }
  ]
}
```

**Flashcard:**
```json
{
  "cards": [
    { "question": "...", "answer": "...", "hint": "..." }
  ]
}
```

**Video Script:**
```json
{
  "title": "...",
  "hook": "...",
  "sections": [
    { "title": "...", "script": "...", "visualNote": "..." }
  ],
  "outro": "..."
}
```

**Poem:**
```json
{
  "title": "...",
  "stanzas": ["...", "..."],
  "explanation": "..."
}
```

---

## 4. AIパイプライン

### 4.1. コンテンツ生成フロー

```
[ユーザー入力]
  sourceText (テキスト)
       ↓
[サーバーサイド tRPC Procedure]
  content.generate (protectedProcedure)
       ↓
[フォーマット別生成関数]
  ├─ generateNovel()     → invokeLLM() × 1回
  ├─ generateManga()     → invokeLLM() + generateImage() × コマ数
  ├─ generateFlashcards() → invokeLLM() × 1回（JSON Schema）
  ├─ generateVideoScript() → invokeLLM() × 1回
  └─ generatePoem()      → invokeLLM() × 1回
       ↓
[カバー画像生成]
  generateImage() ← プロンプト自動生成
       ↓
[DB保存]
  contents テーブルに outputData + coverImageUrl を保存
  status を "completed" に更新
```

### 4.2. LLM呼び出し方針

- すべてのAI呼び出しはサーバーサイドの `invokeLLM()` ヘルパーを使用し、APIキーをクライアントに露出させない。
- 構造化データ（Flashcard等）は `response_format: json_schema` を使用し、型安全なJSONレスポンスを取得する。
- 日本語・英語どちらの入力にも対応するよう、プロンプトに言語検出の指示を含める。

---

## 5. tRPCルーター構成

```
appRouter
├─ auth
│   ├─ me          (public)   現在のユーザー情報取得
│   └─ logout      (public)   セッションクリア
├─ content
│   ├─ generate    (protected) AIコンテンツ生成
│   ├─ getById     (public)    コンテンツ詳細取得
│   ├─ update      (protected) タイトル・公開設定変更
│   ├─ delete      (protected) コンテンツ削除
│   ├─ discover    (public)    公開コンテンツ一覧・検索
│   ├─ myLibrary   (protected) 自分のコンテンツ一覧
│   ├─ getComments (public)    コメント一覧取得
│   ├─ addComment  (protected) コメント投稿
│   ├─ deleteComment (protected) コメント削除
│   ├─ toggleLike  (protected) いいねトグル
│   ├─ toggleBookmark (protected) ブックマークトグル
│   └─ myBookmarks (protected) ブックマーク一覧
└─ user
    ├─ getProfile  (public)    ユーザープロフィール取得
    └─ updateBio   (protected) 自己紹介更新
```

---

## 6. フロントエンド構成

```
client/src/
├─ pages/
│   ├─ Home.tsx          ランディングページ
│   ├─ Create.tsx        コンテンツ生成フォーム
│   ├─ Discover.tsx      ディスカバリー（検索・一覧）
│   ├─ Library.tsx       マイライブラリ
│   ├─ ContentDetail.tsx コンテンツ詳細・ビューア
│   └─ Profile.tsx       ユーザープロフィール
├─ components/
│   ├─ Layout.tsx        グローバルナビゲーション
│   ├─ ContentCard.tsx   コンテンツカードコンポーネント
│   └─ ui/               shadcn/ui コンポーネント群
└─ lib/
    └─ trpc.ts           tRPCクライアント設定
```

---

## 7. テスト方針

Vitestを使用し、以下の観点でテストを実装している。

| テスト種別 | 対象 | テスト数 |
| :--- | :--- | :--- |
| 認証テスト | `auth.logout` のCookie削除動作 | 1 |
| 入力バリデーション | `content.generate` の各種バリデーション | 4 |
| 認証保護テスト | 各protectedProcedureへの未認証アクセス | 5 |
| ユーザーバリデーション | `user.updateBio` のバリデーション | 2 |
| **合計** | | **12** |

```bash
pnpm test
# → 12 tests passed
```
