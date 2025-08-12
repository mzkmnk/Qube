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
