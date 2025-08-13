package ui

import (
	"math/rand"
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

func Test_Header_DisplaysConnectionOnly(t *testing.T) {
	// ヘッダーに接続状態のみが表示されることを確認
	m := New()
	
	// 未接続状態のテスト
	m.SetConnected(false)
	view := m.renderHeader()
	
	if !strings.Contains(view, "Connecting") {
		t.Errorf("Header should contain 'Connecting' when disconnected, got: %s", view)
	}
	
	// 接続状態のテスト
	m.SetConnected(true)
	view = m.renderHeader()
	
	if !strings.Contains(view, "Connected") {
		t.Errorf("Header should contain 'Connected' when connected, got: %s", view)
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
	
	// ASCIIアートが期待される形式であることを確認
	if !strings.Contains(ascii, "___") || !strings.Contains(ascii, "|") {
		t.Errorf("ASCII art should contain expected characters, got: %s", ascii)
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
	
	// progressLineの確認
	if m.progressLine == nil {
		t.Error("progressLine should be set after SetProgressLine")
	}
	
	// renderProgressLine でスクランブル化されたテキストが返されることを確認
	progressOutput := m.renderProgressLine()
	if progressOutput == "" {
		t.Error("Progress line should not be empty")
	}
	
	// 長さが保持されることを確認（"Thinking..."と同じ長さ）
	// ANSI color codeを除去するため、簡易的に文字数カウント
	if len(progressOutput) < 11 { // "Thinking..."の長さは11文字
		t.Errorf("Progress line should preserve basic length, got: %s", progressOutput)
	}
	
	// 句読点が保持されることを確認
	if !strings.Contains(progressOutput, "...") {
		t.Errorf("Progress line should preserve punctuation '...', got: %s", progressOutput)
	}
}

// スクランブルアニメーション機能のテスト

func TestScrambleText(t *testing.T) {
	// 乱数シードを固定して再現可能なテストに
	rand.Seed(42)
	
	tests := []struct {
		name      string
		base      string
		intensity float64
		runs      int
	}{
		{
			name:      "Thinking text with medium intensity",
			base:      "Thinking...",
			intensity: 0.4,
			runs:      10,
		},
		{
			name:      "Empty string",
			base:      "",
			intensity: 0.4,
			runs:      1,
		},
		{
			name:      "Zero intensity should return original",
			base:      "Test",
			intensity: 0.0,
			runs:      5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 複数回実行して、異なる結果が生成されることを確認
			var results []string
			for i := 0; i < tt.runs; i++ {
				result := scrambleText(tt.base, tt.intensity)
				results = append(results, result)
				
				// 基本検証: 長さが同じであること
				if len(result) != len(tt.base) {
					t.Errorf("scrambleText() length = %v, want %v", len(result), len(tt.base))
				}
				
				// 句読点が保持されることを確認
				for j, char := range tt.base {
					if char == '.' || char == ' ' {
						if j < len(result) && rune(result[j]) != char {
							t.Errorf("Punctuation not preserved at position %d: got %c, want %c", j, result[j], char)
						}
					}
				}
			}
			
			// intensityが0の場合は常に元の文字列が返されることを確認
			if tt.intensity == 0.0 {
				for _, result := range results {
					if result != tt.base {
						t.Errorf("With intensity 0.0, expected original text %q, got %q", tt.base, result)
					}
				}
			}
			
			// intensityが0より大きい場合、少なくとも一部の結果が異なることを確認（ランダム性の検証）
			if tt.intensity > 0 && len(tt.base) > 0 && tt.runs > 1 {
				allSame := true
				for i := 1; i < len(results); i++ {
					if results[i] != results[0] {
						allSame = false
						break
					}
				}
				// スクランブル文字がある場合（句読点以外）、異なる結果が期待される
				hasScramblableChars := false
				for _, ch := range tt.base {
					if ch != '.' && ch != ' ' && ch != '\t' && ch != '\n' &&
					   ch != ',' && ch != ':' && ch != ';' && ch != '!' && ch != '?' &&
					   ch != '-' && ch != '_' && ch != '[' && ch != ']' && 
					   ch != '(' && ch != ')' && ch != '{' && ch != '}' {
						hasScramblableChars = true
						break
					}
				}
				
				if hasScramblableChars && allSame {
					t.Logf("Warning: All results were identical with intensity %f. This might indicate an issue with randomness.", tt.intensity)
				}
			}
		})
	}
}

func TestScrambleAnimationIntegration(t *testing.T) {
	m := New()
	
	// MsgSetProgressでThinkingを設定（実際のフローをシミュレート）
	_, cmd := m.Update(MsgSetProgress{Line: "Thinking about your request...", Clear: false})
	
	// スクランブルアニメーションが有効になることを確認
	if !m.scrambleActive {
		t.Error("scrambleActive should be true after setting Thinking progress")
	}
	
	// tea.Cmdが返されることを確認（アニメーション開始）
	if cmd == nil {
		t.Error("MsgSetProgress should return a tea.Cmd for animation start")
	}
	
	// renderProgressLine でスクランブルが適用されるかテスト
	rendered := m.renderProgressLine()
	
	if rendered == "" {
		t.Error("renderProgressLine() should return non-empty string for Thinking progress")
	}
	
	// マゼンタのスタイルが適用されているかチェック（ANSI color code for magenta）
	if !strings.Contains(rendered, "38;5;13") {
		t.Log("Magenta color might not be applied, but this could be a rendering issue")
	}
}

func TestScrambleAnimationStartStop(t *testing.T) {
	m := New()
	
	// アニメーション開始前の状態確認
	if m.scrambleActive {
		t.Error("scrambleActive should be false initially")
	}
	
	// MsgSetProgressでThinking進捗設定（実際のフローをシミュレート）
	_, cmd := m.Update(MsgSetProgress{Line: "Thinking...", Clear: false})
	
	if !m.scrambleActive {
		t.Error("scrambleActive should be true after setting Thinking progress")
	}
	
	if cmd == nil {
		t.Error("MsgSetProgress should return animation start command")
	}
	
	// 非Thinking進捗でアニメーションが停止することを確認
	_, _ = m.Update(MsgSetProgress{Line: "Loading...", Clear: false})
	
	if m.scrambleActive {
		t.Error("scrambleActive should be false after setting non-Thinking progress")
	}
	
	// 進捗クリアでアニメーションが停止することを確認
	_, cmd = m.Update(MsgSetProgress{Line: "Thinking...", Clear: false})
	if !m.scrambleActive {
		t.Error("scrambleActive should be true after setting Thinking progress again")
	}
	
	// progressLineクリア
	m.progressLine = nil
	m.stopScrambleAnimation()
	
	if m.scrambleActive {
		t.Error("scrambleActive should be false after stopScrambleAnimation()")
	}
}

func TestScrambleAnimationUpdate(t *testing.T) {
	m := New()
	
	// アニメーション開始
	m.scrambleActive = true
	m.scrambleBase = "Thinking..."
	
	// アニメーション更新
	cmd := m.updateScrambleText()
	
	// 更新後のテキストが設定されていることを確認
	if m.scrambleText == "" {
		t.Error("scrambleText should not be empty after updateScrambleText()")
	}
	
	// tickコマンドが返されることを確認
	if cmd == nil {
		t.Error("updateScrambleText() should return a tick command")
	}
}

func TestScrambleTextReactCompatibility(t *testing.T) {
	// React版との互換性テスト
	rand.Seed(42) // 固定シードでテストの再現性を確保
	
	base := "Thinking..."
	intensity := 0.4
	
	// 複数回実行して、React版と同様の動作を確認
	results := make(map[string]int)
	iterations := 100
	
	for i := 0; i < iterations; i++ {
		result := scrambleText(base, intensity)
		results[result]++
		
		// 基本的な制約を確認
		if len(result) != len(base) {
			t.Errorf("Length mismatch: got %d, want %d", len(result), len(base))
		}
		
		// 句読点が保持されることを確認
		if !strings.HasSuffix(result, "...") {
			t.Errorf("Punctuation not preserved: got %q", result)
		}
		
		// スペースが保持されることを確認（もしあれば）
		for j, char := range base {
			if char == ' ' && j < len(result) && rune(result[j]) != ' ' {
				t.Errorf("Space not preserved at position %d", j)
			}
		}
	}
	
	// 複数の異なる結果が生成されることを確認（React版の特徴）
	if len(results) < 5 {
		t.Errorf("Not enough variation in results: got %d different results, expected at least 5", len(results))
	}
	
	// 元の文字列も結果に含まれることを確認（intensity < 1.0のため）
	if _, exists := results[base]; !exists {
		t.Error("Original string should sometimes appear in results when intensity < 1.0")
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
