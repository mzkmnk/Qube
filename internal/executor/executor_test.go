package executor

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// モックセッション
type mockSession struct {
	mock.Mock
}

func (m *mockSession) Start(sessionType string) error {
	args := m.Called(sessionType)
	return args.Error(0)
}

func (m *mockSession) Send(text string) error {
	args := m.Called(text)
	return args.Error(0)
}

func (m *mockSession) Stop() error {
	args := m.Called()
	return args.Error(0)
}

func (m *mockSession) IsRunning() bool {
	args := m.Called()
	return args.Bool(0)
}

// モック短命コマンド実行
type mockExecQ struct {
	mock.Mock
}

func (m *mockExecQ) Run(ctx context.Context, args []string) (string, error) {
	argsMock := m.Called(ctx, args)
	return argsMock.String(0), argsMock.Error(1)
}

// イベントリスナー
type EventListener struct {
	StatusChanges []string
	ModeChanges   []string
	Outputs       []string
	Errors        []error
}

func (e *EventListener) OnStatusChange(status string) {
	e.StatusChanges = append(e.StatusChanges, status)
}

func (e *EventListener) OnModeChange(mode string) {
	e.ModeChanges = append(e.ModeChanges, mode)
}

func (e *EventListener) OnOutput(output string) {
	e.Outputs = append(e.Outputs, output)
}

func (e *EventListener) OnError(err error) {
	e.Errors = append(e.Errors, err)
}

func TestCommandExecutor_Execute_ChatCommand(t *testing.T) {
	// q chatコマンドでセッションを開始する
	session := new(mockSession)
	execQ := new(mockExecQ)
	listener := &EventListener{}

	session.On("Start", "chat").Return(nil)

	executor := &CommandExecutor{
		session:        session,
		execQ:          execQ,
		mode:           "command",
		status:         "ready",
		onStatusChange: listener.OnStatusChange,
		onModeChange:   listener.OnModeChange,
		onOutput:       listener.OnOutput,
		onError:        listener.OnError,
	}

	// q chatコマンドを実行
	err := executor.Execute("q chat")

	// アサーション
	assert.NoError(t, err)
	session.AssertExpectations(t)
	
	// モードがsessionに変更されたことを確認
	assert.Equal(t, "session", executor.mode)
	assert.Contains(t, listener.ModeChanges, "session")
	
	// ステータスがrunningに変更されたことを確認
	assert.Equal(t, "running", executor.status)
	assert.Contains(t, listener.StatusChanges, "running")
}


func TestCommandExecutor_Execute_SessionSend(t *testing.T) {
	// セッション中にコマンドを送信する
	session := new(mockSession)
	execQ := new(mockExecQ)
	listener := &EventListener{}

	session.On("IsRunning").Return(true)
	session.On("Send", "Hello, world!\r").Return(nil)

	executor := &CommandExecutor{
		session:        session,
		execQ:          execQ,
		mode:           "session", // 既にセッションモード
		status:         "running",  // 既に実行中
		onStatusChange: listener.OnStatusChange,
		onModeChange:   listener.OnModeChange,
		onOutput:       listener.OnOutput,
		onError:        listener.OnError,
	}

	// セッション中にメッセージを送信
	err := executor.Execute("Hello, world!")

	// アサーション
	assert.NoError(t, err)
	session.AssertExpectations(t)
	
	// モードとステータスは変更されない
	assert.Equal(t, "session", executor.mode)
	assert.Equal(t, "running", executor.status)
}

func TestCommandExecutor_Execute_ShortLivedCommand(t *testing.T) {
	// 短命コマンドを実行する
	session := new(mockSession)
	execQ := new(mockExecQ)
	listener := &EventListener{}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	execQ.On("Run", mock.Anything, []string{"help"}).Return("Q CLI Help Output", nil)

	executor := &CommandExecutor{
		session:        session,
		execQ:          execQ,
		mode:           "command",
		status:         "ready",
		onStatusChange: listener.OnStatusChange,
		onModeChange:   listener.OnModeChange,
		onOutput:       listener.OnOutput,
		onError:        listener.OnError,
	}

	// q helpコマンドを実行
	err := executor.Execute("q help")

	// アサーション
	assert.NoError(t, err)
	execQ.AssertExpectations(t)
	
	// 出力が通知されたことを確認
	assert.Contains(t, listener.Outputs, "Q CLI Help Output")
	
	// ステータスが一時的にrunningになり、readyに戻ることを確認
	assert.Equal(t, "ready", executor.status)
	assert.Contains(t, listener.StatusChanges, "running")
	assert.Contains(t, listener.StatusChanges, "ready")
	
	_ = ctx // コンテキストを使用（linterエラー回避）
}

func TestCommandExecutor_Execute_CommandWithoutQPrefix(t *testing.T) {
	// qプレフィックスなしのコマンドを実行する
	session := new(mockSession)
	execQ := new(mockExecQ)
	listener := &EventListener{}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	execQ.On("Run", mock.Anything, []string{"help"}).Return("Q CLI Help Output", nil)

	executor := &CommandExecutor{
		session:        session,
		execQ:          execQ,
		mode:           "command",
		status:         "ready",
		onStatusChange: listener.OnStatusChange,
		onModeChange:   listener.OnModeChange,
		onOutput:       listener.OnOutput,
		onError:        listener.OnError,
	}

	// プレフィックスなしでhelpコマンドを実行
	err := executor.Execute("help")

	// アサーション
	assert.NoError(t, err)
	execQ.AssertExpectations(t)
	
	// 出力が通知されたことを確認
	assert.Contains(t, listener.Outputs, "Q CLI Help Output")
	
	_ = ctx // コンテキストを使用（linterエラー回避）
}

func TestCommandExecutor_Execute_ErrorHandling(t *testing.T) {
	// エラーハンドリングのテスト
	session := new(mockSession)
	execQ := new(mockExecQ)
	listener := &EventListener{}

	expectedError := assert.AnError
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	execQ.On("Run", mock.Anything, []string{"unknown"}).Return("", expectedError)

	executor := &CommandExecutor{
		session:        session,
		execQ:          execQ,
		mode:           "command",
		status:         "ready",
		onStatusChange: listener.OnStatusChange,
		onModeChange:   listener.OnModeChange,
		onOutput:       listener.OnOutput,
		onError:        listener.OnError,
	}

	// 存在しないコマンドを実行
	err := executor.Execute("q unknown")

	// アサーション
	assert.Error(t, err)
	execQ.AssertExpectations(t)
	
	// エラーが通知されたことを確認
	assert.Contains(t, listener.Errors, expectedError)
	
	// ステータスがerrorに変更されたことを確認
	assert.Equal(t, "error", executor.status)
	assert.Contains(t, listener.StatusChanges, "error")
	
	_ = ctx // コンテキストを使用（linterエラー回避）
}