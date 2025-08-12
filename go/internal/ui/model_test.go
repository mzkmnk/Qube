package ui

import (
	"reflect"
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

	// Up -> two
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	if m.input != "two" {
		t.Fatalf("after 1x Up: got %q, want %q", m.input, "two")
	}
	// Up -> one
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	if m.input != "one" {
		t.Fatalf("after 2x Up: got %q, want %q", m.input, "one")
	}
	// Down -> two
	_, _ = m.Update(tea.KeyMsg{Type: tea.KeyDown})
	if m.input != "two" {
		t.Fatalf("after Down: got %q, want %q", m.input, "two")
	}
	// Down -> ""
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
