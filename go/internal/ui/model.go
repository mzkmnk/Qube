package ui

import (
    "fmt"
    "strings"

    tea "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
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
	executor       CommandExecutorInterface // コマンド実行を管理
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
		executor:     nil, // 後でSetExecutorで設定
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
}

// AddOutput は通常の出力を履歴に追加する
func (m *Model) AddOutput(output string) {
	m.lines = append(m.lines, output)
}

// SetProgressLine は進捗行を設定する
func (m *Model) SetProgressLine(line string) {
	m.progressLine = &line
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

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch v := msg.(type) {
    case tea.WindowSizeMsg:
        // ターミナルサイズが変更された時
        m.width = v.Width
        m.height = v.Height
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
            if s, ok := m.history.Prev(); ok { m.input = s }
            return m, nil
        case tea.KeyDown:
            if s, ok := m.history.Next(); ok { m.input = s }
            return m, nil
        default:
            // 最小プロトタイプのためそれ以外は無視
            return m, nil
        }
    }
    return m, nil
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

// renderOutput は出力部分のレンダリングを行う
func (m Model) renderOutput() string {
	var result []string
	
	// スタイル定義
	userStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("14")) // シアン
	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("14")).
		Width(m.width - 2)
	
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
	
	// progressLineがある場合は追加
	if m.progressLine != nil {
		faintStyle := lipgloss.NewStyle().Faint(true)
		result = append(result, faintStyle.Render(*m.progressLine))
	}
	
	return strings.Join(result, "\n")
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
	help := "^C Exit  ↑↓ History  Enter Send"
	
	// ステータスバーの組み立て
	statusBar := fmt.Sprintf("Mode:%s  Status:%s  Errors:%d  Cmd:%s  %s",
		m.modeStringShort(),
		m.statusStringShort(),
		m.errorCount,
		cmd,
		help,
	)
	
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
    // ヘッダー
    header := m.renderHeader()
    
    // ASCIIロゴ
    ascii := m.renderQubeASCII()

    // 出力
    output := m.renderOutput()

    // 入力
    input := m.renderInput()

    // ステータスバー
    statusBar := m.renderStatusBar()

    return strings.Join([]string{header, ascii, output, input, statusBar}, "\n")
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
