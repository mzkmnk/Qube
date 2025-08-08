# 01: CLI ブートストラップ

- 目的: `npx qube` で実行できる最小構成を用意する。
- 成果物: `bin` エントリ、`tsconfig.json`、実行可能な `dist/cli.js`。

作業項目
- `package.json` に `bin: { "qube": "dist/cli.js" }` を追加。
- `tsconfig.json` を追加（ES2022, module=ESNext, outDir=dist, strict 有効）。
- ビルド後の `dist/cli.js` 先頭に `#!/usr/bin/env node` を付与（shebang）。
  - ビルドスクリプトで自動付与するか、手動で追加
- `npm link` でローカルインストール（開発時のグローバルコマンドとして）。
- `npm run build`/`npm start` を確認。

受け入れ条件
- `npm run build` 後、`node dist/cli.js` で起動できる。
- `npx .`（ローカル）または `npx qube` で CLI が起動する。
- `npm link` 後、グローバルに `qube` コマンドが使用可能。
