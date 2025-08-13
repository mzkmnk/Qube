package ui

import (
    "fmt"
    "math/rand"
    "strings"
    "time"

    tea "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
    "github.com/charmbracelet/bubbles/viewport"
)

// Mode は UI の動作モードを表す。
// command: 短命コマンド実行, session: 対話セッション
//go:generate stringer -type=Mode

type Mode int

const (
	ModeCommand Mode = iota
	ModeSession
)

// Status はステータスバーに表示する状態を表す。
// ready: アイドル, running: 実行中, error: エラー発生
//go:generate stringer -type=Status

type Status int

const (
	StatusReady Status = iota
	StatusRunning
	StatusError
)

// MsgSubmit は Enter で現在の入力を送信した際に発火する。
// 実行（短命/セッション）は外側のコンポーネントが処理する。

type MsgSubmit struct{ Value string }

// 外部イベント用の追加メッセージ
// goroutine から UI を安全に更新するため、tea.Program.Send で送出する
type MsgAddOutput struct{ Line string }
type MsgSetProgress struct{ Line string; Clear bool }
type MsgSetStatus struct{ S Status }
type MsgSetMode struct{ M Mode }
type MsgSetInputEnabled struct{ Enabled bool }
type MsgSetConnected struct{ Connected bool }
type MsgIncrementError struct{}
// 画面と出力履歴のクリア要求
type MsgClearScreen struct{}

// スクランブルアニメーション制御用メッセージ
type MsgScrambleUpdate struct{}
type MsgScrambleStart struct{ Base string }
type MsgScrambleStop struct{}

// History はポインタ移動可能なシンプルなコマンド履歴。
// 連続重複の除外やポインタ移動など、Node 版（src/lib/history.ts）に概ね合わせる。

type History struct {
    items   []string
    pointer int // items のインデックスを指す。len(items) は「空（ブランク）」を表す。
}

func NewHistory() History {
	return History{items: make([]string, 0), pointer: 0}
}

func (h *History) Add(text string) {
    // 直前と同じ入力は連続重複として追加しない
    if len(h.items) > 0 && h.items[len(h.items)-1] == text {
        return
    }
    h.items = append(h.items, text)
    // 追加後はポインタを「空（最後の次）」へ移動
    h.pointer = len(h.items)
}

func (h *History) Prev() (string, bool) {
	if len(h.items) == 0 { return "", false }
	if h.pointer > 0 { h.pointer-- }
	return h.items[h.pointer], true
}

func (h *History) Next() (string, bool) {
	if len(h.items) == 0 { return "", false }
	if h.pointer < len(h.items) { h.pointer++ }
	if h.pointer == len(h.items) { return "", true }
	return h.items[h.pointer], true
}

// CommandExecutorInterface はコマンド実行を抽象化するインターフェース
type CommandExecutorInterface interface {
	Execute(command string) error
	SetEventHandlers(
		onStatusChange func(string),
		onModeChange func(string),
		onOutput func(string),
		onError func(error),
	)
	GetMode() string
	GetStatus() string
}

// Model は最小プロトタイプに必要な UI の状態を保持する。

type Model struct {
	mode           Mode
	status         Status
	input          string
	history        History
	lines          []string
	progressLine   *string
	errorCount     int
	currentCommand string
	title          string  // アプリケーション名
	version        string  // バージョン番号
	connected      bool    // 接続状態
	inputEnabled   bool    // 入力の有効/無効状態
	width          int     // ターミナルの幅
	height         int     // ターミナルの高さ
	viewport       viewport.Model // アプリ全体のスクロール管理
	ready          bool    // viewportの準備ができているか
	executor       CommandExecutorInterface // コマンド実行を管理
	
	// スクランブルアニメーション用フィールド
	scrambleActive bool   // スクランブルアニメーション中か
	scrambleBase   string // 元の文字列（"Thinking..."）
	scrambleText   string // 現在表示する文字列
}

func New() Model {
	return Model{
		mode:         ModeCommand,
		status:       StatusReady,
		input:        "",
		history:      NewHistory(),
		lines:        []string{},
		progressLine: nil,
		errorCount:   0,
		currentCommand: "",
		title:        "Qube",
		version:      "0.1.0",
		connected:    false,
		inputEnabled: true,
		width:        80,  // デフォルト幅
		height:       24,  // デフォルト高さ
		ready:        false, // viewport初期化前
		executor:     nil, // 後でSetExecutorで設定
		
		// スクランブルアニメーション用フィールドの初期化
		scrambleActive: false,
		scrambleBase:   "",
		scrambleText:   "",
	}
}

// NewWithExecutor はCommandExecutorを指定してModelを作成する
func NewWithExecutor(executor CommandExecutorInterface) Model {
	m := New()
	m.SetExecutor(executor)
	return m
}

// SetExecutor はCommandExecutorを設定し、イベントハンドラーを登録する
func (m *Model) SetExecutor(executor CommandExecutorInterface) {
	m.executor = executor
	if executor != nil {
		// イベントハンドラーを設定
		executor.SetEventHandlers(
			// onStatusChange
			func(status string) {
				switch status {
				case "ready":
					m.SetStatus(StatusReady)
					m.SetInputEnabled(true)
				case "running":
					m.SetStatus(StatusRunning)
					m.SetInputEnabled(false)
				case "error":
					m.SetStatus(StatusError)
					m.SetInputEnabled(true)
				}
			},
			// onModeChange
			func(mode string) {
				if mode == "session" {
					m.SetMode(ModeSession)
				} else {
					m.SetMode(ModeCommand)
				}
			},
			// onOutput
			func(output string) {
				m.AddOutput(output)
			},
			// onError
			func(err error) {
				m.IncrementErrorCount()
				m.AddOutput("Error: " + err.Error())
			},
		)
	}
}

func (m Model) Init() tea.Cmd { return nil }

// SetTitle はアプリケーションタイトルを設定する
func (m *Model) SetTitle(title string) {
	m.title = title
}

// SetVersion はバージョン番号を設定する
func (m *Model) SetVersion(version string) {
	m.version = version
}

// SetConnected は接続状態を設定する
func (m *Model) SetConnected(connected bool) {
	m.connected = connected
}

// AddUserInput はユーザー入力を履歴に追加する
func (m *Model) AddUserInput(input string) {
	m.lines = append(m.lines, "USER_INPUT:"+input)
	m.updateViewportContent()
}

// AddOutput は通常の出力を履歴に追加する
func (m *Model) AddOutput(output string) {
	m.lines = append(m.lines, output)
	m.updateViewportContent()
}

// SetProgressLine は進捗行を設定する
func (m *Model) SetProgressLine(line string) {
	m.progressLine = &line
	
	// "Thinking"以外の場合はスクランブルアニメーションを停止
	if !strings.Contains(strings.ToLower(line), "thinking") {
		if m.scrambleActive {
			m.stopScrambleAnimation()
		}
	}
	
	m.updateViewportContent()
}

// updateViewportContent はviewportのコンテンツを更新する
func (m *Model) updateViewportContent() {
	if m.ready {
		content := m.buildScrollableContent()
		m.viewport.SetContent(content)
		// 自動的に最下部にスクロール
		m.viewport.GotoBottom()
	}
}

// SetInputEnabled は入力の有効/無効を設定する
func (m *Model) SetInputEnabled(enabled bool) {
	m.inputEnabled = enabled
}

// SetMode はモードを設定する
func (m *Model) SetMode(mode Mode) {
	m.mode = mode
}

// GetMode は現在のモードを取得する
func (m *Model) GetMode() Mode {
	return m.mode
}

// SetStatus はステータスを設定する
func (m *Model) SetStatus(status Status) {
	m.status = status
}

// GetStatus は現在のステータスを取得する
func (m *Model) GetStatus() Status {
	return m.status
}

// IncrementErrorCount はエラーカウントを増加させる
func (m *Model) IncrementErrorCount() {
	m.errorCount++
}

// GetErrorCount はエラーカウントを取得する
func (m *Model) GetErrorCount() int {
	return m.errorCount
}

// SetCurrentCommand は現在実行中のコマンドを設定する
func (m *Model) SetCurrentCommand(command string) {
	m.currentCommand = command
}

// buildScrollableContent はviewportに表示するスクロール可能部分を構築する
func (m *Model) buildScrollableContent() string {
	// ヘッダー
	header := m.renderHeader()
	
	// ASCIIロゴ
	ascii := m.renderQubeASCII()

	// 出力履歴
	output := m.renderAllOutput()

	// progressLineがある場合は追加
	progressRendered := m.renderProgressLine()
	if progressRendered != "" {
		output += "\n" + progressRendered
	}

	return strings.Join([]string{header, ascii, output}, "\n")
}

// buildContent は全体のコンテンツを構築する（viewport初期化前の互換性用）
func (m *Model) buildContent() string {
	// ヘッダー
	header := m.renderHeader()
	
	// ASCIIロゴ
	ascii := m.renderQubeASCII()

	// 出力履歴
	output := m.renderAllOutput()

	// progressLineがある場合は追加
	progressRendered := m.renderProgressLine()
	if progressRendered != "" {
		output += "\n" + progressRendered
	}

	// 入力
	input := m.renderInput()

	// ステータスバー
	statusBar := m.renderStatusBar()

	return strings.Join([]string{header, ascii, output, input, statusBar}, "\n")
}

// renderAllOutput は全ての出力を表示する（スクロール制御なし）
func (m *Model) renderAllOutput() string {
	var result []string
	
	// スタイル定義
	userStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("14")) // シアン
	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("14")).
		Width(m.width - 2)
	
	// 全ての行を表示
	for _, line := range m.lines {
		if strings.HasPrefix(line, "USER_INPUT:") {
			// ユーザー入力は枠線付きで表示
			message := strings.TrimPrefix(line, "USER_INPUT:")
			userLine := userStyle.Render("▶ " + message)
			result = append(result, boxStyle.Render(userLine))
		} else {
			// 通常の出力はそのまま表示
			result = append(result, line)
		}
	}
	
	return strings.Join(result, "\n")
}

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    var cmd tea.Cmd
    
    switch v := msg.(type) {
    case tea.WindowSizeMsg:
        // ターミナルサイズが変更された時
        m.width = v.Width
        m.height = v.Height
        
        if !m.ready {
            // 初回のウィンドウサイズ設定時にviewportを初期化
            // 固定部分の高さを計算：入力(3行) + ステータスバー(1行) = 4行
            viewportHeight := v.Height - 4
            if viewportHeight < 10 {
                viewportHeight = 10 // 最小高さを確保
            }
            m.viewport = viewport.New(v.Width, viewportHeight)
            m.viewport.SetContent(m.buildScrollableContent())
            m.viewport.GotoBottom() // 初期位置は最下部
            m.ready = true
        } else {
            // サイズ変更時はviewportのサイズを更新
            viewportHeight := v.Height - 4
            if viewportHeight < 10 {
                viewportHeight = 10
            }
            m.viewport.Width = v.Width
            m.viewport.Height = viewportHeight
            m.updateViewportContent()
        }
        return m, nil
    case MsgSubmit:
        // MsgSubmitを受け取った時にCommandExecutorを呼び出す
        if m.executor != nil {
            m.SetCurrentCommand(v.Value)
            go func() {
                _ = m.executor.Execute(v.Value)
            }()
        }
        return m, nil
    case MsgAddOutput:
        m.AddOutput(v.Line)
        return m, nil
    case MsgSetProgress:
        if v.Clear {
            m.progressLine = nil
            // 進捗クリア時はスクランブルアニメーションも停止
            if m.scrambleActive {
                m.stopScrambleAnimation()
            }
        } else {
            m.SetProgressLine(v.Line)
            // "Thinking"が含まれる場合はスクランブルアニメーションを開始
            if strings.Contains(strings.ToLower(v.Line), "thinking") && !m.scrambleActive {
                return m, m.startScrambleAnimation("Thinking...")
            }
        }
        return m, nil
    case MsgSetStatus:
        m.SetStatus(v.S)
        return m, nil
    case MsgSetMode:
        m.SetMode(v.M)
        return m, nil
    case MsgSetInputEnabled:
        m.SetInputEnabled(v.Enabled)
        return m, nil
    case MsgSetConnected:
        m.SetConnected(v.Connected)
        return m, nil
    case MsgIncrementError:
        m.IncrementErrorCount()
        return m, nil
    case MsgClearScreen:
        // 出力履歴と進捗をクリア
        m.lines = []string{}
        m.progressLine = nil
        // スクランブルアニメーションも停止
        m.stopScrambleAnimation()
        // viewportのコンテンツもクリア
        m.updateViewportContent()
        // 物理画面もクリア（スクロールバック含め可能な範囲で）
        return m, func() tea.Msg {
            // ESC[3J: スクロールバック消去, ESC[H: カーソル先頭, ESC[2J: 画面消去
            print("\x1b[3J\x1b[H\x1b[2J")
            return nil
        }
    case MsgScrambleUpdate:
        // スクランブルアニメーションフレーム更新
        cmd := m.updateScrambleText()
        // スクランブルテキスト更新後、viewportを更新
        m.updateViewportContent()
        return m, cmd
    case MsgScrambleStart:
        // スクランブルアニメーション開始
        return m, m.startScrambleAnimation(v.Base)
    case MsgScrambleStop:
        // スクランブルアニメーション停止
        m.stopScrambleAnimation()
        return m, nil
    case tea.KeyMsg:
        switch v.Type {
        case tea.KeyCtrlC:
            return m, tea.Quit
        case tea.KeyEnter:
            text := m.input
            if text == "" { return m, nil }
            m.history.Add(text)
            m.input = ""
            // ユーザー入力を表示に追加
            m.AddUserInput(text)
            return m, func() tea.Msg { return MsgSubmit{Value: text} }
        case tea.KeyBackspace, tea.KeyCtrlH:
            // バックスペースで末尾 1 文字（rune）を削除
            if m.input != "" {
                r := []rune(m.input)
                if len(r) > 0 { m.input = string(r[:len(r)-1]) }
            }
            return m, nil
        case tea.KeyRunes:
            // 入力された文字（rune）を末尾に追加
            if len(v.Runes) > 0 {
                m.input += string(v.Runes)
            }
            return m, nil
        case tea.KeyUp:
            // 履歴ナビゲーション
            if s, ok := m.history.Prev(); ok { m.input = s }
            return m, nil
        case tea.KeyDown:
            // 履歴ナビゲーション
            if s, ok := m.history.Next(); ok { m.input = s }
            return m, nil
        default:
            // その他のキー（スクロール関連含む）はviewportに委譲
            if m.ready {
                m.viewport, cmd = m.viewport.Update(msg)
            }
            return m, cmd
        }
    default:
        // マウス操作など、その他のメッセージもviewportに委譲
        if m.ready {
            m.viewport, cmd = m.viewport.Update(msg)
        }
    }
    return m, cmd
}

// renderQubeASCII はQUBEのASCIIロゴを生成する
func (m Model) renderQubeASCII() string {
	// シンプルなASCIIアート（figlet風）
	ascii := `
  ___   _   _  ____   _____ 
 / _ \ | | | ||  _ \ | ____|
| | | || | | || |_) ||  _|  
| |_| || |_| ||  _ < | |___ 
 \__\_\ \___/ |_| \_\|_____|
                             
       Q U B E  v0.1.0       `
	
	// lipglossでカラー適用
	logoStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("201")) // マゼンタ
	return logoStyle.Render(ascii)
}

// renderInput は入力部分のレンダリングを行う
func (m Model) renderInput() string {
	// スタイル定義 - ターミナル幅に合わせて調整
	// ボーダーとパディングを考慮して幅を計算（左右ボーダー2文字 + パディング2文字 = 4文字）
	contentWidth := m.width - 4
	if contentWidth < 20 {
		contentWidth = 20 // 最小幅を確保
	}
	
	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		Padding(0, 1).
		Width(m.width - 2)
	
	// プロンプトの選択
	var prompt string
	if m.inputEnabled {
		prompt = "▶ "
	} else {
		prompt = "◌ "
	}
	
	// 入力フィールドのレンダリング
	inputField := prompt + m.input
	
	// プレースホルダー表示
	if m.input == "" && !m.inputEnabled {
		inputField = prompt + lipgloss.NewStyle().Faint(true).Render("(waiting...)")
	}
	
	return boxStyle.Render(inputField)
}

// renderStatusBar はステータスバー部分のレンダリングを行う
func (m Model) renderStatusBar() string {
	// スタイル定義
	faint := lipgloss.NewStyle().Faint(true)
	
	// コマンドの省略表示（20文字まで）
	cmd := m.currentCommand
	if len(cmd) > 20 {
		cmd = cmd[:17] + "..."
	}
	
	// ヘルプテキスト
	help := "^C Exit  ↑↓ History  PgUp/PgDn Scroll  Mouse Wheel"
	
	// viewportのスクロール情報を取得
	scrollInfo := ""
	if m.ready {
		scrollPercent := m.viewport.ScrollPercent()
		if scrollPercent <= 0.0 {
			scrollInfo = "⬆ TOP"
		} else if scrollPercent >= 1.0 {
			scrollInfo = "⬇ BOTTOM"
		} else {
			scrollInfo = fmt.Sprintf("📜 %.0f%%", scrollPercent*100)
		}
	}
	
	// ステータスバーの組み立て
	statusBar := fmt.Sprintf("Mode:%s  Status:%s  Errors:%d",
		m.modeStringShort(),
		m.statusStringShort(),
		m.errorCount,
	)
	
	if scrollInfo != "" {
		statusBar = fmt.Sprintf("%s  [%s]  %s", statusBar, scrollInfo, help)
	} else {
		statusBar = fmt.Sprintf("%s  %s", statusBar, help)
	}
	
	return faint.Render(statusBar)
}

// renderHeader はヘッダー部分のレンダリングを行う
func (m Model) renderHeader() string {
	// スタイル定義
	titleStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("201")) // マゼンタ
	versionStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("8")) // グレー
	connectedStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("10")) // 緑
	disconnectedStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("11")) // 黄色
	
	// タイトルとバージョン
	titlePart := fmt.Sprintf("◆ %s", titleStyle.Render(m.title))
	versionPart := versionStyle.Render(fmt.Sprintf("v%s", m.version))
	
	// 接続インジケータ
	var connectionPart string
	if m.connected {
		connectionPart = connectedStyle.Render("● Connected")
	} else {
		connectionPart = disconnectedStyle.Render("○ Connecting...")
	}
	
	// ヘッダー行を組み立て
	header := fmt.Sprintf("%s %s                    %s", titlePart, versionPart, connectionPart)
	
	return header
}

func (m Model) View() string {
    if !m.ready {
        // viewport初期化前は従来通りの表示
        return m.buildContent()
    }
    
    // スクロール可能部分（viewport）
    scrollableContent := m.viewport.View()
    
    // 固定部分
    input := m.renderInput()
    statusBar := m.renderStatusBar()
    
    // レイアウト組み立て：スクロール可能部分 + 固定部分
    return strings.Join([]string{scrollableContent, input, statusBar}, "\n")
}

// 描画用の表記変換ヘルパ
func (m Model) modeString() string {
    switch m.mode {
    case ModeCommand:
        return "Command"
    case ModeSession:
        return "Session"
    default:
        return "?"
    }
}

func (m Model) modeStringShort() string {
    switch m.mode {
    case ModeCommand:
        return "Cmd"
    case ModeSession:
        return "Chat"
    default:
        return "?"
    }
}

func (m Model) statusString() string {
    switch m.status {
    case StatusReady:
        return "Ready"
    case StatusRunning:
        return "Running"
    case StatusError:
        return "Error"
    default:
        return "?"
    }
}

func (m Model) statusStringShort() string {
    switch m.status {
    case StatusReady:
        return "ready"
    case StatusRunning:
        return "running"
    case StatusError:
        return "error"
    default:
        return "?"
    }
}

// スクランブルアニメーション用のヘルパー関数

// スクランブル用文字セット（React版のDEFAULT_CHARSETに対応）
const scrambleCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// scrambleText は指定された文字列をスクランブル変換する
// intensity: 0.0-1.0の範囲で文字の変換確率を指定（React版では0.4）
func scrambleText(base string, intensity float64) string {
	if base == "" {
		return ""
	}
	
	chars := []rune(base)
	charsetRunes := []rune(scrambleCharset)
	result := make([]rune, len(chars))
	
	for i, ch := range chars {
		// スペースや句読点は保持（React版と同じロジック）
		if ch == ' ' || ch == '\t' || ch == '\n' {
			result[i] = ch
			continue
		}
		if ch == '.' || ch == ',' || ch == ':' || ch == ';' || ch == '!' || ch == '?' || 
		   ch == '-' || ch == '_' || ch == '[' || ch == ']' || ch == '(' || ch == ')' || 
		   ch == '{' || ch == '}' {
			result[i] = ch
			continue
		}
		
		// intensityの確率でランダム文字に置換（React版の実装と同じ）
		if rand.Float64() < intensity {
			randomIdx := rand.Intn(len(charsetRunes))
			result[i] = charsetRunes[randomIdx]
		} else {
			// スクランブルしない場合は元の文字をそのまま使用
			result[i] = ch
		}
	}
	
	return string(result)
}

// startScrambleAnimation はスクランブルアニメーションを開始する
func (m *Model) startScrambleAnimation(base string) tea.Cmd {
	m.scrambleActive = true
	m.scrambleBase = base
	m.scrambleText = base
	
	// 30FPSでアニメーション更新を開始
	return tea.Tick(time.Millisecond*33, func(t time.Time) tea.Msg {
		return MsgScrambleUpdate{}
	})
}

// stopScrambleAnimation はスクランブルアニメーションを停止する
func (m *Model) stopScrambleAnimation() {
	m.scrambleActive = false
	m.scrambleBase = ""
	m.scrambleText = ""
}

// updateScrambleText はスクランブルテキストを更新する
func (m *Model) updateScrambleText() tea.Cmd {
	if !m.scrambleActive {
		return nil
	}
	
	// テキストをスクランブル変換（intensity=0.4はReact版と同じ）
	m.scrambleText = scrambleText(m.scrambleBase, 0.4)
	
	// 次のフレームをスケジュール
	return tea.Tick(time.Millisecond*33, func(t time.Time) tea.Msg {
		return MsgScrambleUpdate{}
	})
}

// renderProgressLine は進捗行をレンダリングし、必要に応じてスクランブルアニメーションを適用する
func (m *Model) renderProgressLine() string {
	if m.progressLine == nil {
		return ""
	}
	
	line := *m.progressLine
	
	// "Thinking"が含まれる場合はスクランブルアニメーションを適用
	if strings.Contains(strings.ToLower(line), "thinking") {
		// スクランブルアニメーション中の場合はスクランブルテキストを表示
		if m.scrambleActive && m.scrambleText != "" {
			scrambleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("11")) // 黄色
			return scrambleStyle.Render(m.scrambleText)
		} else {
			// アニメーション未開始の場合は元のテキストを表示
			scrambleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("11")) // 黄色
			return scrambleStyle.Render("Thinking...")
		}
	} else {
		// Thinking以外の進捗は通常のfaintスタイルで表示
		faintStyle := lipgloss.NewStyle().Faint(true)
		return faintStyle.Render(line)
	}
}
