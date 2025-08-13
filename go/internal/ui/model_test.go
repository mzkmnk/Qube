package ui

import (
	"reflect"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func Test_NewModel_DefaultState(t *testing.T) {
	m := New()
	if m.mode != ModeCommand {
		t.Fatalf("mode: got %v, want %v", m.mode, ModeCommand)
	}
	if m.status != StatusReady {
		t.Fatalf("status: got %v, want %v", m.status, StatusReady)
	}
	if m.input != "" {
		t.Fatalf("input: got %q, want empty", m.input)
	}
	if len(m.history.items) != 0 {
		t.Fatalf("history length: got %d, want 0", len(m.history.items))
	}
	if m.progressLine != nil {
		t.Fatalf("progressLine: got non-nil, want nil")
	}
	if len(m.lines) != 0 {
		t.Fatalf("lines length: got %d, want 0", len(m.lines))
	}
	if m.errorCount != 0 {
		t.Fatalf("errorCount: got %d, want 0", m.errorCount)
	}
	if m.currentCommand != "" {
		t.Fatalf("currentCommand: got %q, want empty", m.currentCommand)
	}
}

func Test_Update_EnterSubmitsMsgAndClearsInputAndAddsHistory(t *testing.T) {
	m := New()
	m.input = "echo hi"

	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	if cmd == nil {
		t.Fatalf("cmd is nil; want MsgSubmit")
	}
	msg := cmd()
	switch v := msg.(type) {
	case MsgSubmit:
		if v.Value != "echo hi" {
			t.Fatalf("MsgSubmit value: got %q, want %q", v.Value, "echo hi")
		}
	default:
		t.Fatalf("unexpected msg type: %T", msg)
	}
	if m.input != "" {
		t.Fatalf("input not cleared: got %q, want empty", m.input)
	}
	if len(m.history.items) != 1 || m.history.items[0] != "echo hi" {
		t.Fatalf("history not updated: %#v", m.history.items)
	}
}

func Test_Update_UpDownHistoryNavigation(t *testing.T) {
	m := New()
	m.history.Add("one")
	m.history.Add("two")

    // 上矢印: two へ
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	if m.input != "two" {
		t.Fatalf("after 1x Up: got %q, want %q", m.input, "two")
	}
    // 上矢印: one へ
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	if m.input != "one" {
		t.Fatalf("after 2x Up: got %q, want %q", m.input, "one")
	}
    // 下矢印: two へ
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyDown})
	if m.input != "two" {
		t.Fatalf("after Down: got %q, want %q", m.input, "two")
	}
    // 下矢印: 空文字 へ
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyDown})
	if m.input != "" {
		t.Fatalf("after 2x Down: got %q, want empty", m.input)
	}
}

func Test_Update_CtrlCQuits(t *testing.T) {
	m := New()
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlC})
	if cmd == nil {
		t.Fatalf("cmd is nil; want tea.Quit")
	}
	msg := cmd()
	if reflect.TypeOf(msg) != reflect.TypeOf(tea.QuitMsg{}) {
		t.Fatalf("got %T, want tea.QuitMsg", msg)
	}
}

// Headerコンポーネントのパリティテスト

func Test_Header_DisplaysTitleAndVersion(t *testing.T) {
	// ヘッダーにタイトルとバージョンが表示されることを確認
	m := New()
	m.SetTitle("Qube")
	m.SetVersion("0.1.0")
	
	view := m.renderHeader()
	
	// タイトルが含まれていることを確認
	if !strings.Contains(view, "Qube") {
		t.Errorf("Header should contain title 'Qube', got: %s", view)
	}
	
	// バージョンが含まれていることを確認
	if !strings.Contains(view, "0.1.0") {
		t.Errorf("Header should contain version '0.1.0', got: %s", view)
	}
}

func Test_Header_ShowsConnectionIndicator(t *testing.T) {
	// 接続インジケータが表示されることを確認
	m := New()
	
	// 非接続状態のテスト
	m.SetConnected(false)
	view := m.renderHeader()
	if !strings.Contains(view, "○") || !strings.Contains(view, "Connecting") {
		t.Errorf("Header should show disconnected indicator, got: %s", view)
	}
	
	// 接続状態のテスト
	m.SetConnected(true)
	view = m.renderHeader()
	if !strings.Contains(view, "●") || !strings.Contains(view, "Connected") {
		t.Errorf("Header should show connected indicator, got: %s", view)
	}
}

// QUBE ASCII ロゴのパリティテスト

func Test_QubeASCII_DisplaysFigletLogo(t *testing.T) {
	// QUBE ASCIIロゴが表示されることを確認
	m := New()
	ascii := m.renderQubeASCII()
	
	// ASCIIアートに "QUBE" の文字が含まれていることを確認
	if !strings.Contains(ascii, "Q") || !strings.Contains(ascii, "U") || 
	   !strings.Contains(ascii, "B") || !strings.Contains(ascii, "E") {
		t.Errorf("ASCII art should contain QUBE letters, got: %s", ascii)
	}
	
	// ASCIIアートが複数行であることを確認（figletの特徴）
	lines := strings.Split(ascii, "\n")
	if len(lines) < 3 {
		t.Errorf("ASCII art should have multiple lines, got %d lines", len(lines))
	}
}

// Output コンポーネントのパリティテスト

func Test_Output_DisplaysUserInputWithFrame(t *testing.T) {
	// ユーザー入力が枠線付きで表示されることを確認
	m := New()
	m.AddUserInput("hello world")
	
	output := m.renderAllOutput()
	
	// ユーザー入力のプレフィックスと内容を確認
	if !strings.Contains(output, "▶") {
		t.Errorf("Output should contain user input prompt '▶', got: %s", output)
	}
	if !strings.Contains(output, "hello world") {
		t.Errorf("Output should contain user input 'hello world', got: %s", output)
	}
}

func Test_Output_DisplaysNormalOutputAsIs(t *testing.T) {
	// 通常の出力がそのまま表示されることを確認
	m := New()
	m.AddOutput("System output line 1")
	m.AddOutput("System output line 2")
	
	output := m.renderAllOutput()
	
	// 通常出力がそのまま含まれていることを確認
	if !strings.Contains(output, "System output line 1") {
		t.Errorf("Output should contain normal output line 1, got: %s", output)
	}
	if !strings.Contains(output, "System output line 2") {
		t.Errorf("Output should contain normal output line 2, got: %s", output)
	}
}

// Thinking アニメーションのパリティテスト

func Test_Thinking_ShowsProgressLine(t *testing.T) {
	// Thinking表示時にprogressLineが設定されることを確認
	m := New()
	m.SetProgressLine("Thinking...")
	
	output := m.renderAllOutput()
	
	// Thinkingが含まれていることを確認
	if !strings.Contains(output, "Thinking") {
		t.Errorf("Output should contain 'Thinking' progress, got: %s", output)
	}
}

// Input コンポーネントのパリティテスト

func Test_Input_ShowsProperPromptAndPlaceholder(t *testing.T) {
	// 適切なプロンプトとプレースホルダーが表示されることを確認
	m := New()
	
	// アクティブ状態
	m.SetInputEnabled(true)
	input := m.renderInput()
	if !strings.Contains(input, "▶") {
		t.Errorf("Active input should show '▶' prompt, got: %s", input)
	}
	
	// 無効状態
	m.SetInputEnabled(false)
	input = m.renderInput()
	if !strings.Contains(input, "◌") {
		t.Errorf("Disabled input should show '◌' prompt, got: %s", input)
	}
}

// StatusBar コンポーネントのパリティテスト

func Test_StatusBar_ShowsModeAndStatus(t *testing.T) {
	// StatusBarがmode、status、errorCount、ヘルプを表示することを確認
	m := New()
	m.mode = ModeSession
	m.status = StatusRunning
	m.errorCount = 2
	m.currentCommand = "q chat"
	
	statusBar := m.renderStatusBar()
	
	// モードの確認
	if !strings.Contains(statusBar, "Chat") {
		t.Errorf("StatusBar should show mode 'Chat', got: %s", statusBar)
	}
	
	// ステータスの確認
	if !strings.Contains(statusBar, "running") {
		t.Errorf("StatusBar should show status 'running', got: %s", statusBar)
	}
	
	// エラーカウントの確認
	if !strings.Contains(statusBar, "2") {
		t.Errorf("StatusBar should show error count '2', got: %s", statusBar)
	}
	
	// ヘルプの確認
	if !strings.Contains(statusBar, "^C Exit") || !strings.Contains(statusBar, "↑↓ History") {
		t.Errorf("StatusBar should show help text, got: %s", statusBar)
	}
}
