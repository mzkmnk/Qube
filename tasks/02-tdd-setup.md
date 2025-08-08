# 02: TDD セットアップ

- 目的: t-waga 推奨の TDD サイクルを実践できるテスト環境を整備する。
- 成果物: Vitest 設定、最初のサンプルテスト、`npm test` スクリプト。

作業項目
- 依存追加（dev）: `vitest`, `@types/node`, `ts-node`（必要なら）, `ink-testing-library`。
- `package.json` に `test: "vitest"` を追加。
- `vitest.config.ts` 追加（ESM 対応、`tsconfig` 参照）。
- サンプル: `src/__tests__/smoke.test.tsx` に最小テスト（Ink の `render` で "Hello" を検証）。

受け入れ条件
- `npm test` が成功する。
- サンプルテストが Red→Green の履歴で残る（コミットメッセージに明示）。
