# 04: TUI シェルの骨格

- 目的: Ink による最小 UI（ヘッダー、出力パネル、入力、ステータス）を実装する。
- 成果物: `App` 構成、スクロール可能な出力、入力から Q CLI 実行、終了/クリアのキーバインド。

作業項目
- レイアウト構成:
  - ヘッダー: `<Box>` と `<Text>` でタイトル/バージョン表示
  - 出力パネル: `<Box flexDirection="column">` でスクロール可能な領域
  - 入力行: `<TextInput>` コンポーネントまたは `useInput` フック
  - ステータスバー: コマンド実行状態、エラー数など
- キーバインド実装:
  - `useInput` フックでキー入力をハンドリング
  - Enter 実行、Ctrl+C 終了、Ctrl+L クリア、↑↓ で履歴
- 実装分離:
  - `components/Header.tsx`, `components/Output.tsx`, `components/Input.tsx`, `components/StatusBar.tsx`
  - `lib/history.ts` （履歴管理）
- ユニットテスト: レンダリングと基本操作（入力→出力表示）。

受け入れ条件
- 手動確認でコマンドを投げて出力が見られる。
- 主要キーバインドが動作し、テストで検証される。
