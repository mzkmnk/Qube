# Qube - Amazon Q CLI TUI Wrapper

QubeはAmazon Q CLIのためのReactベースのTUI（ターミナルユーザーインターフェース）ラッパーです。

## 🎯 プロジェクトの目的

Amazon Q CLIにインタラクティブなシェル体験を提供：
- 永続的なチャットセッション
- コマンド履歴管理
- リアルタイムストリーミング出力
- 直感的なキーバインディング

## 🚀 クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発モードで起動
npm run dev

# テスト実行
npm test

# ビルド
npm run build
```

## 📋 開発タスク

タスクは`tasks/`ディレクトリに定義されています：

1. **[完了] CLI ブートストラップ** - TypeScript/Node.js環境構築
2. **[完了] TDD セットアップ** - Vitestによるテスト環境
3. **[完了] Q CLI 検出とプロセス起動** - バイナリ検出と子プロセス管理
4. **[次] TUI シェル** - Inkによるインタラクティブインターフェース
5. **ストリーム処理** - ANSIエスケープシーケンスとJSON解析
6. **コマンドとフラグ** - 引数解析と検証
7. **設定とテレメトリ** - ユーザー設定管理
8. **E2Eテスト** - 統合テスト

詳細は各タスクファイル（`tasks/XX-*.md`）を参照してください。

## 🏗️ アーキテクチャ

### ディレクトリ構造
```
/
├── src/
│   ├── cli.tsx            # メインエントリポイント
│   ├── components/        # UIコンポーネント
│   ├── lib/              # ユーティリティ
│   │   ├── q-cli-detector.ts  # Q CLIバイナリ検出
│   │   ├── spawn-q.ts         # プロセス起動（単発実行）
│   │   └── q-session.ts       # セッション管理（永続的対話）
│   └── types/            # TypeScript型定義
├── tasks/                # 開発タスク定義
└── docs/                # ドキュメント
```

### 主要コンポーネント

#### 実装済み
- **Q CLI検出**: 環境変数とPATHからバイナリを検出
- **プロセス起動**: `spawnQ()`で単発コマンド実行
- **セッション管理**: `QSession`クラスで永続的な対話（基本実装）

#### 実装予定
- **TUIシェル**: Inkベースのインタラクティブインターフェース
- **ストリーム処理**: リアルタイム出力とANSI処理
- **履歴管理**: コマンド履歴の保存と検索

## 🧪 テスト

TDD（テスト駆動開発）を採用：

```bash
# 全テスト実行
npm test

# 特定のテストファイル実行
npm test -- src/lib/spawn-q.test.ts

# ウォッチモード
npm run test:watch
```

## 🤝 コントリビューション

1. タスクファイル（`tasks/`）を確認
2. TDDサイクルに従って実装：
   - Red: 失敗するテストを書く
   - Green: テストを通す最小限の実装
   - Refactor: コードを改善
3. コミットメッセージは日本語でも英語でも可
4. PRを作成

## 📝 ライセンス

MIT

## 🔗 関連リンク

- [Amazon Q CLI](https://aws.amazon.com/q/developer/)
- [Ink - React for CLI](https://github.com/vadimdemedes/ink)