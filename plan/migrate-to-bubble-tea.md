# Ink → Bubble Tea 移行計画（デグレなし）

本計画は、現行の React + Ink ベース CLI（`src/`）を Go + Bubble Tea に段階的に移行し、ユーザー体験・機能を維持しつつデグレを防止するためのチェックリストです。Node 実装は当面併存し、パリティが確認でき次第切替を行います。

## 0. 現状の機能インベントリ（確認済み）
- [x] UI: `Header`（タイトル/バージョン/接続状態）、`QubeTitle`（figlet）、`Output`（ユーザー入力枠付き表示/通常出力/Thinking…演出）、`Input`（TextInput + Enter送信）、`StatusBar`（状態/モード/ヘルプ）
- [x] キーハンドリング: Ctrl+C 終了、↑↓ 履歴、Enter 送信（`KeyboardHandler`/`ControlledTextInput`）
- [x] 履歴: `CommandHistory`（重複除去、ポインタ移動、最大件数）
- [x] プロセス実行: 短命コマンド `spawnQ`（`node-pty`）、インタラクティブ `QSession`（`node-pty`）
- [x] ストリーム処理: `StreamProcessor`（CR 進捗行/Thinking 抑制・一回だけ履歴化、エコーバック除去、改行分割）
- [x] 検出/ユーティリティ: `detectQCLI`、`clearTerminal`
- [x] 起動: `src/cli.tsx` から `App` を描画、起動時 `QSession` 自動開始（chat）
- [x] テスト: Vitest + ink-testing-library による UI/挙動/プロセス/ストリーム多数テスト

---

## 1. 要件固定（パリティ定義）
- [x] 入力/キーバインド: Ctrl+C 終了、↑↓ 履歴移動、Enter 送信（Disabled 時は無効）
- [x] モード/状態: `mode: command|session`、`status: ready|running|error` の表示・遷移
- [x] 出力表示: ユーザー入力は枠付き `▶ message`、通常出力は素通し（ANSI 色維持）
- [x] 進捗表現: CR による進捗更新を 1 行だけ履歴化、`Thinking…` は履歴化せず進捗表示のみ
- [x] Thinking 演出: Ink のスクランブルアニメーションを Bubble Tea 側で再現（Tick ベース）
- [x] エコーバック抑制: セッションへの直前送信文字列の行一致は出力から除外
- [x] セッション: 起動時に `chat` 自動開始、`initialized` 検知（ANSI 除去後のパターン同等）
- [x] エラー: 起動/実行エラーの表示と `errorCount` インクリメント、`error` ステータス反映
- [x] 見た目: Header/StatusBar/枠線/色（できる限り類似）、figlet ロゴ相当

## 2. アーキテクチャ設計（Go 側構成）
- [x] Go モジュール: `go.mod`、パッケージ構成（例）
  - [x] `cmd/qube/`（エントリ）
  - [x] `internal/ui/`（Bubble Tea model + view: header/output/input/status）
  - [x] `internal/session/`（PTY セッション、初期化検知、イベント発火）
  - [x] `internal/execq/`（短命コマンド、LookPath 検出、タイムアウト）
  - [x] `internal/stream/`（StreamProcessor 移植）
  - [x] `internal/keys/`（キーバインド）
  - [x] `internal/ascii/`（figlet 代替: go-figure など）
- [x] 主要ライブラリ選定
  - [x] UI: `github.com/charmbracelet/bubbletea`、`bubbles/textinput`、`lipgloss`
  - [x] PTY: `github.com/creack/pty`（インタラクティブセッション）
  - [x] 実行: `os/exec` + `exec.CommandContext`（短命）、`exec.LookPath`（検出）
  - [x] ASCII: `github.com/common-nighthawk/go-figure` など

## 3. 仕様の抽出と共通フィクスチャ（デグレ防止）
- [x] ストリーム仕様を言語非依存のサンプルで固定（CR/ANSI/Thinking/途中行）
- [x] `fixtures/streams/*.txt` を作成（Node 版の `StreamProcessor` を利用して生成）
- [x] 期待行列（golden）を `fixtures/golden/*.txt` として保存
- [x] Go 側 `internal/stream` テストで fixtures を読み、golden と一致を確認

メモ:
- 生成スクリプト: `scripts/generate-golden.ts`（`npm run generate:golden`）
- フィクスチャ例: `basic-cr-progress.txt`、`thinking.txt`、`echo-filter.txt`、`ansi.txt`、`buffering.txt`
- ディレクティブ: 行頭 `>>SET_LAST_CMD: <text>` はエコーバック抑制用に `lastSentCommand` を設定

## 4. 最小 UI プロトタイプ（Go）
- [x] `tea.Model` で `state {mode,status,input,history,lines,progressLine,errorCount,currentCommand}` を定義
- [x] Header/StatusBar/Output/Input の最小実装（色/枠は lipgloss で近似）
- [x] Enter で `MsgSubmit(value)`、↑↓ で履歴移動（`CommandHistory` 相当を Go 実装）
- [x] Ctrl+C ハンドリング（`tea.Quit`）

## 5. ストリーム処理の移植
- [x] `StreamProcessor` のロジックを Go 実装に移植
  - [x] CR 分割で末尾のみ進捗対象化、改行確定で 1 回だけ履歴化
  - [x] `Thinking` ラインは履歴化せず `progressLine` にのみ反映（並行してスクランブル描画）
  - [x] エコーバック除去（直前送信コマンドと完全一致行）
  - [x] 改行での分割と不完全行のバッファリング
- [x] ANSI は素通し（UI 側で描画、色は端末準拠）
- [x] fixtures/golden と一致するかテスト

## 6. プロセス実行（短命 / セッション）
- [ ] `execq.Run(args)` で短命コマンド（標準出力統合、タイムアウト、終了コード）
- [ ] `session.Start(mode)` で PTY スポーン、`OnData`/`OnExit`/`OnError` の購読
- [ ] 初期化検知: ANSI 除去 → 正規表現（`You are chatting with` またはセパレーター後空行）
- [ ] 送信: `session.Send(text + CR)`、停止: `session.Stop()`

## 7. コマンド実行のポーティング
- [ ] `CommandExecutor` 相当（Go）で `execute(command, mode)` を実装
  - [ ] `q chat|translate` は `mode=session; session.Start(type)`
  - [ ] `mode=session && running` は `session.Send`
  - [ ] それ以外は `execq.Run`（`q` の prefix 除去含む）
  - [ ] `onStatusChange`, `onModeChange`, `onOutput`, `onError` の通知

## 8. UI 細部のパリティ合わせ
- [ ] Header: タイトル/バージョン/接続インジケータ（●/○ 表現）
- [ ] QUBE ASCII: figlet 相当（カラーは `lipgloss`）
- [ ] Output: ユーザー入力は枠線＋`▶` で表示、通常出力は素通し
- [ ] Thinking: スクランブルアニメーションを再現（Tick/Timer で FPS/強度/混合モードを実装）
- [ ] Input: Disabled 表示/placeholder 切替、プロンプト `▶/◌` の切替
- [ ] StatusBar: `mode`（Cmd/Chat）、`status`、`errorCount`、`currentCommand` 省略表示、ヘルプ `^C Exit ↑↓ History`

## 9. 併存検証（開発者向け）
- [ ] `npm run start:go` で Go 版を起動（開発者ローカルのみ）
- [ ] Node 版と Go 版を同一マシンで起動し、主要シナリオを目視比較
- [ ] 切替手段（環境変数/フォールスルー等）の導入は不要（配布前提でないため）

## 10. テスト戦略（段階）
- [ ] 単体: `internal/*` を Go 側でテスト（ストリーム処理・履歴・検出・実行）
- [ ] フィクスチャ: Node 生成の golden と Go 出力の突き合わせ
- [ ] 結合: `tea.Program` で UI + session/exec の統合テスト（疑似セッション）
- [ ] 目視: 主要ユースケース（help、chat 入出力、エラー系、進捗系）を目視で比較
- [ ] パフォーマンス/TTY: 主要 OS/端末（macOS/Linux、iTerm/Alacritty/Windows Terminal）で確認

## 11. 既知のリスクと緩和
- [ ] PTY 差異（macOS/Linux/Windows）→ `creack/pty` の既知事例に合わせ、端末サイズ/改行/エンコーディングを明示
- [ ] ANSI/VTE 差異 → 可能な限り素通し、UI の色付けは `lipgloss` に限定
- [ ] スクランブル演出差 → Bubble Tea の Tick 駆動で再現し、負荷/ちらつきを抑制
- [ ] `detectQCLI` の差 → `exec.LookPath` と `Q_BIN` の両対応、エラー文言の整合
- [ ] 国際化（全角/幅計算）→ `lipgloss.Width` 等で幅計算、はみ出し対策

### 初期化判定（Initialization Detection）仕様（詳細）
- [x] 目的: `QSession` 起動直後の大量 ANSI/案内文を UI に載せず、準備完了を検知してから通常表示に遷移する。
- [x] 前処理: 受信バッファに対して ANSI エスケープを除去してプレーンテキストを得る。
  - 正規表現例（Node 実装同等）: `ESC="\u001B"; pattern=new RegExp(`${ESC}\\[[0-9;]*[mGKJH]`, "g")`
- [x] 判定条件（いずれか満たせば初期化完了）:
  - 文言検知: `/You are chatting with .+/i`
  - セパレーター検知: `/━{10,}[\s\S]*?\n\s*\n/`（連続罫線の後に空行）
- [x] タイムアウト: 10 秒でフォールバック完了扱い（イベント `initialized` 発火）。
- [x] 状態遷移: 初回成立で `isInitialized=true`、累積バッファは破棄し、以降の出力を UI へパス。
- [x] Go 実装方針:
  - ANSI 除去: `regexp` で同等パターン、もしくは既製の軽量関数を内製
  - 条件適用: 上記 2 条件 + タイムアウト（`time.AfterFunc(10s)`）
  - イベント: `initialized` 相当のメッセージを UI に `tea.Msg` で通知
  - テスト: fixtures で初期データを流し、検知有/無・タイムアウトの 3 系列を golden で確認

---

## 完了条件（Definition of Done）
- [ ] fixtures/golden に対する Go 側ストリーム処理テストがグリーン
- [ ] 主要 UI 構成（Header, Output, Input, StatusBar）が Node 版と同等の見え方/操作性
- [ ] `q help` 等の短命コマンドと `chat` セッションの代表シナリオで入出力が一致
- [ ] 併存起動（Node/Go）が可能で、Go 版に既知のクリティカル欠陥がない
