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

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch v := msg.(type) {
    case tea.KeyMsg:
        switch v.Type {
        case tea.KeyCtrlC:
            return m, tea.Quit
        case tea.KeyEnter:
            text := m.input
            if text == "" { return m, nil }
            m.history.Add(text)
            m.input = ""
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
    // スタイル定義
    boxStyle := lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).Padding(0, 1)
    faint := lipgloss.NewStyle().Faint(true)

    // ヘッダー
    header := m.renderHeader()

    // 出力（履歴 + 進捗行）
    bodyLines := make([]string, 0, len(m.lines)+1)
    bodyLines = append(bodyLines, m.lines...)
    if m.progressLine != nil {
        bodyLines = append(bodyLines, faint.Render(*m.progressLine))
    }
    body := boxStyle.Render(strings.Join(bodyLines, "\n"))

    // 入力
    prompt := "▶ "
    input := boxStyle.Render(prompt + m.input)

    // ステータスバー
    help := "^C Exit  ↑↓ History  Enter Send"
    statusBar := faint.Render(fmt.Sprintf("Mode:%s  Status:%s  Errors:%d  %s", m.modeStringShort(), m.statusStringShort(), m.errorCount, help))

    return strings.Join([]string{header, body, input, statusBar}, "\n")
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
