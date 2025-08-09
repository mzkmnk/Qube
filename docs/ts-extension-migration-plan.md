# TypeScript拡張子（.ts）を使用するための移行プラン

## 現状の課題
- ES Modulesでは実行時の拡張子（.js）を指定する必要がある
- ソースは`.ts`だが、importは`.js`という不一致が混乱を招く

## 解決策の選択肢

### プラン1: tsx/Bunランタイムの活用（推奨）
**メリット**: 最小限の変更で実現可能
**デメリット**: 実行時にtsx/Bunが必要

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler", // すでに設定済み
    "allowImportingTsExtensions": true, // .ts拡張子を許可
    "noEmit": true // tsxがトランスパイルするため
  }
}
```

変更手順:
1. tsconfig.jsonに`allowImportingTsExtensions`と`noEmit`を追加
2. すべてのimport文を`.js`から`.ts`に変更
3. ビルドはtsx/esbuildで行う

### プラン2: CommonJSに戻す
**メリット**: 拡張子なしでimport可能
**デメリット**: ES Modulesの利点を失う

```json
// package.json
{
  "type": "commonjs" // または削除
}

// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node"
  }
}
```

### プラン3: TypeScript 5.0のallowImportingTsExtensions
**メリット**: TypeScript公式サポート
**デメリット**: emitができない（bundler前提）

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "emitDeclarationOnly": false
  }
}
```

実装:
```typescript
// ✅ .ts拡張子でimport可能
import { detectQCLI } from './q-cli-detector.ts'
import { spawnQ } from './spawn-q.ts'
```

### プラン4: パスマッピング + ビルドツール
**メリット**: クリーンなimport
**デメリット**: 設定が複雑

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/lib/*": ["src/lib/*"],
      "@/components/*": ["src/components/*"]
    }
  }
}
```

```typescript
// 拡張子なしでimport
import { detectQCLI } from '@/lib/q-cli-detector'
```

ビルド時にesbuild/rollupで解決

## 推奨アプローチ

### 短期的解決（すぐに実装可能）
**プラン1**を採用し、tsxランタイムを活用:

1. tsconfig.jsonを更新
2. import文を一括置換（`.js` → `.ts`）
3. package.jsonのスクリプトをtsx/Bunベースに変更

### 長期的解決
**プラン4**のパスマッピング + esbuildでのバンドル:

1. より本格的なビルドパイプライン構築
2. 本番用は最適化されたバンドルを生成
3. 開発時はtsx、本番はesbuildでビルド

## 実装例

### 即座に試せる変更

```bash
# 1. tsconfig.json更新
# 2. 一括置換
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/from '\(.*\)\.js'/from '\1.ts'/g"
# 3. テスト実行
npm test
```

## 影響範囲

- すべてのimport文（約20-30箇所）
- テストファイル
- Vitestの設定（変更不要の可能性大）
- ビルドプロセス（tsx使用なら変更不要）