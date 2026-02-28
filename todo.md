# MelodyMind (Transmemo MVP) TODO

## Phase 1: DB・サーバーサイド
- [x] DBスキーマ設計（contents, tags, content_tags, likes, comments, bookmarks）
- [x] DBマイグレーション実行
- [x] サーバーサイドDB helpers実装
- [x] コンテンツ生成tRPCルーター（Novel/Manga/Flashcard/VideoScript/Poem）
- [x] コンテンツCRUDルーター（保存・取得・削除・公開設定）
- [x] いいね・コメント・ブックマークルーター
- [x] 検索・ディスカバリールーター

## Phase 2: フロントエンド
- [x] グローバルレイアウト・ナビゲーション
- [x] ランディングページ（Home.tsx）
- [x] コンテンツ生成ページ（Create.tsx）
- [x] ディスカバリーページ（Discover.tsx）
- [x] マイライブラリページ（Library.tsx）
- [x] コンテンツ詳細ページ（ContentDetail.tsx）
- [x] ユーザープロフィールページ（Profile.tsx）

## Phase 3: 仕上げ
- [x] Vitest テスト作成（13 tests passed）
- [x] チェックポイント保存
