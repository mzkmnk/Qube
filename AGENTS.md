# Repository Guidelines

## プロジェクト構成
- `src/`: CLI 本体。エントリ: `src/cli.tsx`（Ink + React）。
- `dist/`: TypeScript のビルド成果物（`npm run build` で生成）。
- `node_modules/`: 依存ライブラリ。
- ルート: `package.json`, `package-lock.json`, `.gitignore`。

推奨ディレクトリ（将来拡張時）:
- `src/components/` UI コンポーネント、`src/lib/` ユーティリティ、`src/types/` 共有型定義。

## 開発・ビルド・実行
- `npm run dev`: `tsx` によるウォッチ実行（ビルド不要）。
- `npm run build`: `tsc` で型チェックし `dist/` へ出力。
- `npm start`: 生成物を実行（`node dist/cli.js`）。

例: `npm run dev` で編集しながら `src/cli.tsx` を確認。

## コーディング規約・命名
- TypeScript（ES Modules、インデント2スペース）。
- ファイル名は `kebab-case`、React コンポーネントは `PascalCase`。可能な範囲で named export。
- コンポーネントは関数コンポーネントを基本に、小さく分割・責務を明確化。
- 整形/静的解析: まだ未導入。導入時は Prettier 既定 + TypeScript strict を推奨。

## テスト方針
- まだテスト基盤なし。導入は Vitest または Jest を推奨。
- 置き場所: `src/__tests__/` または同階層 `*.test.ts(x)`。
- Ink の入出力はモック化。重要処理は ≥80% カバレッジを目安。
- 実行例: 設定後 `npx vitest`。

## TDD 方針（t-waga 推奨）
- Red → Green → Refactor を徹底。失敗するテストを先に書き、最小実装で通し、その後リファクタ。
- 振る舞い駆動: 外部挙動（入出力・副作用）をテストし内部実装詳細に依存しない。
- プロセス間通信と例外系（`child_process.spawn`、タイムアウト、非ゼロ終了）を優先的に追加。
- 小さなステップで commit。テスト名は仕様を短文で記述（日本語可）。

## コミット / PR ガイドライン
- 現在の履歴は最小限。Conventional Commits を推奨（例: `feat: …`, `fix: …`）。
- コミットは小さく焦点を明確に。理由が不明瞭な変更は説明を記載。
- PR には概要、確認手順（`npm run dev`/`npm start`）、UI 変更はスクリーンショットやログ、関連 Issue を添付。

## 言語ポリシー
- 日本語での更新・記載を歓迎します。
- 日本語中心へ移行する場合、PR に要点の簡潔な英訳を併記してください。
- コミットメッセージ/コメントは英語推奨ですが、日本語も可（チームで統一）。

## セキュリティ / 設定
- Node 22+ を推奨。秘密情報をコミットしないでください。
- 依存は最小限に保ち、標準機能や小規模ユーティリティを優先。
- 設定や環境変数を追加する際は `README` に明記し、安全なデフォルトを提供。
