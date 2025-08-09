# Vitestベースのビルド代替案

## 現状の課題
- build.mjsの手動メンテナンスが必要
- esbuildとVitestで別々のビルドパイプライン
- 設定の重複

## プラン1: Viteをビルドツールとして使用（推奨）

### 概要
VitestはViteベースなので、Viteのビルド機能を活用

### 実装
```js
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/cli.tsx',
      formats: ['es'],
      fileName: 'cli'
    },
    rollupOptions: {
      external: ['react', 'ink', /^node:.*$/],
      output: {
        banner: '#!/usr/bin/env node\n'
      }
    },
    target: 'node22',
    outDir: 'dist',
    minify: false
  },
  test: {
    // 既存のVitest設定
  }
})
```

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "test": "vitest --no-watch"
  }
}
```

### メリット
- ✅ 統一された設定ファイル
- ✅ Vitestとの完全な互換性
- ✅ プラグインエコシステムの活用
- ✅ HMR対応の開発サーバー

### デメリット
- ⚠️ Node.js CLIアプリには過剰かもしれない
- ⚠️ Rollupベースなので少し遅い可能性

---

## プラン2: tsupを使用（シンプル）

### 概要
esbuildベースの軽量ビルドツール、設定最小限

### 実装
```json
// package.json
{
  "scripts": {
    "build": "tsup src/cli.tsx --format esm --target node22 --shims",
    "test": "vitest --no-watch"
  }
}
```

```js
// tsup.config.ts (オプション)
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node22',
  shims: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
})
```

### メリット
- ✅ ゼロコンフィグ
- ✅ esbuildの高速性を維持
- ✅ TypeScript対応がデフォルト
- ✅ 自動的な依存関係の外部化

### デメリット
- ⚠️ 新しい依存関係の追加
- ⚠️ Vitestとは別のツール

---

## プラン3: unbuildを使用（Nuxt/UnJS標準）

### 概要
Rollup/esbuildのハイブリッド、自動設定検出

### 実装
```js
// build.config.ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/cli'],
  declaration: false,
  rollup: {
    emitCJS: false,
    esbuild: {
      target: 'node22'
    }
  },
  hooks: {
    'rollup:options': (ctx, options) => {
      options.output.banner = '#!/usr/bin/env node\n'
    }
  }
})
```

```json
// package.json
{
  "scripts": {
    "build": "unbuild",
    "test": "vitest --no-watch"
  }
}
```

### メリット
- ✅ スマートなデフォルト設定
- ✅ package.jsonから自動推論
- ✅ スタブ生成で開発時の高速化
- ✅ 複数エントリポイント対応

### デメリット
- ⚠️ 学習コストがある
- ⚠️ ドキュメントが少ない

---

## 比較表

| 項目 | Vite (プラン1) | tsup (プラン2) | unbuild (プラン3) | 現状 (esbuild) |
|------|---------------|----------------|-------------------|----------------|
| 設定の簡潔さ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| ビルド速度 | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Vitestとの統合 | ★★★★★ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ |
| メンテナンス性 | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| エコシステム | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★☆ |

## 推奨

**短期的**: プラン2（tsup）
- 最小限の設定変更
- 現在のesbuildの速度を維持
- すぐに導入可能

**長期的**: プラン1（Vite）
- Vitestとの完全な統合
- 豊富なプラグイン
- 将来的な拡張性