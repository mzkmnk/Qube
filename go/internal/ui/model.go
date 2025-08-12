package ui

import (
	tea "github.com/charmbracelet/bubbletea"
)

// Mode represents the operational mode of the UI
// command: execute short-lived commands, session: interactive
//go:generate stringer -type=Mode

type Mode int

const (
	ModeCommand Mode = iota
	ModeSession
)

// Status represents the current status shown in the status bar
// ready: idle, running: processing, error: error occurred
//go:generate stringer -type=Status

type Status int

const (
	StatusReady Status = iota
	StatusRunning
	StatusError
)

// MsgSubmit is emitted when user presses Enter to submit current input
// and is handled by outer executor/session.

type MsgSubmit struct{ Value string }

// History is a simple command history with pointer navigation
// behavior mirrors src/lib/history.ts (dedup, pointer movement, cap omitted for MVP)

type History struct {
	items   []string
	pointer int // points to the index in items; len(items) means "blank"
}

func NewHistory() History {
	return History{items: make([]string, 0), pointer: 0}
}

func (h *History) Add(text string) {
	// deduplicate consecutive same entries
	if len(h.items) > 0 && h.items[len(h.items)-1] == text {
		return
	}
	h.items = append(h.items, text)
	// after adding, reset pointer to blank (after last)
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

// Model holds minimal UI state required for the prototype

type Model struct {
	mode           Mode
	status         Status
	input          string
	history        History
	lines          []string
	progressLine   *string
	errorCount     int
	currentCommand string
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
	}
}

func (m Model) Init() tea.Cmd { return nil }

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
		case tea.KeyUp:
			if s, ok := m.history.Prev(); ok { m.input = s }
			return m, nil
		case tea.KeyDown:
			if s, ok := m.history.Next(); ok { m.input = s }
			return m, nil
		default:
			// no-op for other keys in this minimal prototype
			return m, nil
		}
	}
	return m, nil
}

func (m Model) View() string {
	// Minimal placeholder; actual lipgloss rendering will come later
	return ""
}
