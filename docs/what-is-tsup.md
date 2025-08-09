# tsupとは？

## 概要
tsupは、**esbuildを使用したTypeScript/JavaScriptのバンドラー**です。設定なしで動作することを目指した、シンプルなビルドツールです。

- 作者: [egoist](https://github.com/egoist)（Viteコアチームメンバー）
- GitHub: https://github.com/egoist/tsup
- ベース: esbuild（超高速バンドラー）

## 主な特徴

### 1. ゼロコンフィグ
```bash
# これだけで動く！
tsup src/index.ts
```

### 2. TypeScriptネイティブサポート
- `.ts`、`.tsx`ファイルを直接処理
- 型定義ファイル（.d.ts）の自動生成
- tsconfig.jsonを自動的に読み込み

### 3. 複数フォーマット同時出力
```bash
# ESM、CommonJS、IIFEを同時に生成
tsup src/index.ts --format esm,cjs,iife
```

### 4. 自動的な依存関係の処理
- node_modulesの依存を自動的に外部化（external）
- Tree-shakingサポート
- Code splittingサポート

## 実際の使用例

### 基本的な使い方
```json
// package.json
{
  "scripts": {
    "build": "tsup src/cli.tsx"
  }
}
```

### 設定ファイルを使う場合
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.tsx'],        // エントリーポイント
  format: ['esm'],               // 出力フォーマット
  dts: true,                     // 型定義ファイル生成
  splitting: false,              // コード分割
  sourcemap: true,               // ソースマップ
  clean: true,                   // ビルド前にdistをクリーン
  minify: false,                 // 圧縮
  target: 'node22',              // ターゲット環境
  shims: true,                   // Node.js用のshim
  banner: {
    js: '#!/usr/bin/env node'    // ファイル先頭に追加
  }
})
```

## なぜtsupが便利なのか？

### 従来のビルドツールの問題点

#### webpack/Rollup
```js
// webpack.config.js - 長い設定が必要
module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  // さらに多くの設定...
};
```

#### 素のesbuild
```js
// build.mjs - 手動でスクリプトを書く必要
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: ['react', 'ink'],  // 手動で指定
  // その他の設定...
})
```

#### tsup
```bash
# これだけ！
tsup src/cli.tsx
```

## tsupが適している場面

### ✅ 向いているプロジェクト
- **CLIツール**: Node.js向けのコマンドラインツール
- **ライブラリ**: npm packageの公開
- **APIサーバー**: Express/Fastifyなどのバックエンド
- **ユーティリティ**: 小〜中規模のTypeScriptプロジェクト

### ❌ 向いていないプロジェクト
- **フロントエンドSPA**: ViteやNext.jsの方が適切
- **複雑なビルド要件**: カスタムローダーやプラグインが必要な場合
- **レガシーブラウザ対応**: IE11などの古いブラウザサポート

## Qubeプロジェクトでtsupを使うメリット

1. **build.mjsが不要になる**
   - 現在: 手動でesbuild設定を管理
   - tsup: 設定ファイル不要 or 最小限

2. **メンテナンスが楽**
   - 依存関係の自動検出
   - TypeScript設定の自動読み込み

3. **開発体験の向上**
   - watchモード内蔵: `tsup --watch`
   - 型定義ファイル生成: `tsup --dts`
   - 開発用ビルド: `tsup --env.NODE_ENV development`

4. **esbuildの速度を維持**
   - 内部でesbuildを使用
   - 余計なオーバーヘッドなし

## 実際のコマンド例

```bash
# 基本ビルド
tsup src/cli.tsx

# watchモード（ファイル変更を監視）
tsup src/cli.tsx --watch

# 複数エントリーポイント
tsup src/cli.tsx src/lib/index.ts

# 型定義ファイル付き
tsup src/cli.tsx --dts

# 本番ビルド（圧縮あり）
tsup src/cli.tsx --minify

# フォーマット指定
tsup src/cli.tsx --format esm,cjs

# 環境変数の設定
tsup src/cli.tsx --env.NODE_ENV production
```

## まとめ

tsupは「**esbuildの速度**」と「**設定の簡単さ**」を両立したビルドツールです。

特にNode.js向けのCLIツールやライブラリの開発では、webpackやRollupのような複雑な設定は不要で、tsup一つで完結できます。

Qubeのような**TypeScript製のCLIツール**には最適な選択肢の一つです。