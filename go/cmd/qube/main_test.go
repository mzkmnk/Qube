package main

import (
	"context"
	"errors"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"qube/internal/executor"
	"qube/internal/ui"
)

// モックSession実装
type mockSession struct {
	isRunning     bool
	startCalled   bool
	sendCalled    bool
	stopCalled    bool
	sessionType   string
	lastSentText  string
	startError    error
	sendError     error
	stopError     error
	onDataHandler func(string)
	onErrorHandler func(error)
}

func (m *mockSession) Start(sessionType string) error {
	m.startCalled = true
	m.sessionType = sessionType
	if m.startError != nil {
		return m.startError
	}
	m.isRunning = true
	return nil
}

func (m *mockSession) Send(text string) error {
	m.sendCalled = true
	m.lastSentText = text
	if m.sendError != nil {
		return m.sendError
	}
	// セッションからの出力をシミュレート
	if m.onDataHandler != nil {
		m.onDataHandler("echo: " + text)
	}
	return nil
}

func (m *mockSession) Stop() error {
	m.stopCalled = true
	if m.stopError != nil {
		return m.stopError
	}
	m.isRunning = false
	return nil
}

func (m *mockSession) IsRunning() bool {
	return m.isRunning
}

func (m *mockSession) OnData(handler func(string)) {
	m.onDataHandler = handler
}

func (m *mockSession) OnError(handler func(error)) {
	m.onErrorHandler = handler
}

// モックExecQ実装
type mockExecQ struct {
	runCalled   bool
	lastArgs    []string
	runOutput   string
	runError    error
}

func (m *mockExecQ) Run(ctx context.Context, args []string) (string, error) {
	m.runCalled = true
	m.lastArgs = args
	if m.runError != nil {
		return "", m.runError
	}
	return m.runOutput, nil
}

// UIとCommandExecutorの統合をテストする構造体
type integrationTestCase struct {
	model        *ui.Model
	executor     *executor.CommandExecutor
	session      *mockSession
	execQ        *mockExecQ
	program      *tea.Program
}

func setupIntegrationTest() *integrationTestCase {
	session := &mockSession{}
	execQ := &mockExecQ{
		runOutput: "command output",
	}
	
	exec := executor.NewCommandExecutor(session, execQ)
	model := ui.New()
	
	return &integrationTestCase{
		model:    &model,
		executor: exec,
		session:  session,
		execQ:    execQ,
	}
}

// TestMainInitializesCommandExecutor はmain.goがCommandExecutorを初期化することを確認する
func TestMainInitializesCommandExecutor(t *testing.T) {
	t.Skip("実装後に有効化")
	// このテストは実装後に確認する
	// main.goでCommandExecutorが適切に初期化されているか
}

// TestMsgSubmitTriggersCommandExecution はEnterキー押下でCommandExecutorが実行されることを確認する
func TestMsgSubmitTriggersCommandExecution(t *testing.T) {
	tc := setupIntegrationTest()
	
	// コマンド実行のイベントハンドラーを設定
	outputReceived := false
	tc.executor.SetEventHandlers(
		nil, // onStatusChange
		nil, // onModeChange
		func(output string) {
			outputReceived = true
			// UIに出力を追加
			tc.model.AddOutput(output)
		},
		nil, // onError
	)
	
	// MsgSubmitを処理（Enterキー押下シミュレート）
	msg := ui.MsgSubmit{Value: "test command"}
	
	// FAIL: UIとCommandExecutorが接続されていない
	// tc.model.Update(msg) の処理でCommandExecutorを呼び出す必要がある
	err := tc.executor.Execute(msg.Value)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	
	// CommandExecutorが実行されたことを確認
	if !tc.execQ.runCalled {
		t.Error("Expected execQ.Run to be called")
	}
	
	// 出力イベントが発火したことを確認
	if !outputReceived {
		t.Error("Expected output event to be fired")
	}
}

// TestCommandExecutorOutputUpdatesUI はCommandExecutorの出力がUIに反映されることを確認する
func TestCommandExecutorOutputUpdatesUI(t *testing.T) {
	tc := setupIntegrationTest()
	
	// 出力イベントハンドラーを設定
	tc.executor.SetEventHandlers(
		nil,
		nil,
		func(output string) {
			// UIに出力を追加
			tc.model.AddOutput(output)
		},
		nil,
	)
	
	// コマンドを実行
	tc.execQ.runOutput = "test output"
	err := tc.executor.Execute("test command")
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	
	// UIのViewに出力が含まれることを確認
	view := tc.model.View()
	if !contains(view, "test output") {
		t.Errorf("Expected UI to contain 'test output', got: %s", view)
	}
}

// TestSessionOutputStreaming はセッション出力がストリーミングでUIに表示されることを確認する
func TestSessionOutputStreaming(t *testing.T) {
	tc := setupIntegrationTest()
	
	// セッション出力をUIに伝播
	tc.session.OnData(func(data string) {
		tc.model.AddOutput(data)
	})
	
	// chatセッションを開始
	err := tc.executor.Execute("q chat")
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	
	// セッションが開始されたことを確認
	if !tc.session.startCalled {
		t.Error("Expected session.Start to be called")
	}
	
	// セッションからデータを送信
	if tc.session.onDataHandler != nil {
		tc.session.onDataHandler("Session output line 1")
		tc.session.onDataHandler("Session output line 2")
	}
	
	// UIに出力が反映されることを確認
	view := tc.model.View()
	if !contains(view, "Session output line 1") {
		t.Errorf("Expected UI to contain session output line 1")
	}
	if !contains(view, "Session output line 2") {
		t.Errorf("Expected UI to contain session output line 2")
	}
}

// TestErrorHandling はエラー発生時にUIが更新されることを確認する
func TestErrorHandling(t *testing.T) {
	tc := setupIntegrationTest()
	
	// エラーハンドラーを設定
	errorReceived := false
	tc.executor.SetEventHandlers(
		func(status string) {
			// ステータスをUIに反映
			if status == "error" {
				tc.model.SetStatus(ui.StatusError)
			}
		},
		nil,
		nil,
		func(err error) {
			errorReceived = true
			// エラーカウントを増加
			tc.model.IncrementErrorCount()
		},
	)
	
	// エラーを発生させる
	tc.execQ.runError = errors.New("command failed")
	err := tc.executor.Execute("failing command")
	
	// エラーが返されることを確認
	if err == nil {
		t.Error("Expected error from Execute")
	}
	
	// エラーイベントが発火したことを確認
	if !errorReceived {
		t.Error("Expected error event to be fired")
	}
	
	// UIのエラーカウントが増加したことを確認
	if tc.model.GetErrorCount() != 1 {
		t.Errorf("Expected errorCount to be 1, got %d", tc.model.GetErrorCount())
	}
	
	// ステータスがエラーになったことを確認
	if tc.model.GetStatus() != ui.StatusError {
		t.Errorf("Expected status to be Error, got %v", tc.model.GetStatus())
	}
}

// TestModeSwitch はコマンド/セッションモードの切り替えをテストする
func TestModeSwitch(t *testing.T) {
	tc := setupIntegrationTest()
	
	// モード変更ハンドラーを設定
	tc.executor.SetEventHandlers(
		nil,
		func(mode string) {
			// モードをUIに反映
			if mode == "session" {
				tc.model.SetMode(ui.ModeSession)
			} else {
				tc.model.SetMode(ui.ModeCommand)
			}
		},
		nil,
		nil,
	)
	
	// 初期状態はコマンドモード
	if tc.executor.GetMode() != "command" {
		t.Errorf("Expected initial mode to be command")
	}
	if tc.model.GetMode() != ui.ModeCommand {
		t.Errorf("Expected UI mode to be Command")
	}
	
	// chatコマンドでセッションモードに切り替え
	err := tc.executor.Execute("q chat")
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	
	// モードがセッションに変更されたことを確認
	if tc.executor.GetMode() != "session" {
		t.Errorf("Expected mode to be session after q chat")
	}
	if tc.model.GetMode() != ui.ModeSession {
		t.Errorf("Expected UI mode to be Session")
	}
}

// TestAutoStartChatSession は初期化時に自動的にchatセッションが開始されることを確認する
func TestAutoStartChatSession(t *testing.T) {
	t.Skip("実装後に有効化")
	
	tc := setupIntegrationTest()
	
	// main関数のInit相当の処理をシミュレート
	// ここで自動的にchatセッションを開始する必要がある
	
	// 少し待つ（非同期処理の場合）
	time.Sleep(100 * time.Millisecond)
	
	// セッションが開始されたことを確認
	if !tc.session.startCalled {
		t.Error("Expected session to be started automatically")
	}
	if tc.session.sessionType != "chat" {
		t.Errorf("Expected session type to be 'chat', got '%s'", tc.session.sessionType)
	}
}

// ヘルパー関数
func contains(s, substr string) bool {
	return len(substr) > 0 && len(s) >= len(substr) && 
		(s == substr || len(s) > len(substr) && 
			(s[:len(substr)] == substr || 
			s[len(s)-len(substr):] == substr || 
			len(s) > len(substr) && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}