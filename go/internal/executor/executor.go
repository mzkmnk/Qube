package executor

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// Session インタフェース（PTYセッションの抽象化）
type Session interface {
	Start(sessionType string) error
	Send(text string) error
	Stop() error
	IsRunning() bool
}

// ExecQ インタフェース（短命コマンド実行の抽象化）
type ExecQ interface {
	Run(ctx context.Context, args []string) (string, error)
}

// CommandExecutor はコマンド実行を管理する構造体
type CommandExecutor struct {
	session        Session
	execQ          ExecQ
	mode           string // "command" | "session"
	status         string // "ready" | "running" | "error"
	onStatusChange func(status string)
	onModeChange   func(mode string)
	onOutput       func(output string)
	onError        func(err error)
}

// NewCommandExecutor は新しいCommandExecutorを作成する
func NewCommandExecutor(session Session, execQ ExecQ) *CommandExecutor {
	return &CommandExecutor{
		session: session,
		execQ:   execQ,
		mode:    "command",
		status:  "ready",
		// デフォルトの空のハンドラー
		onStatusChange: func(string) {},
		onModeChange:   func(string) {},
		onOutput:       func(string) {},
		onError:        func(error) {},
	}
}

// SetEventHandlers はイベントハンドラーを設定する
func (c *CommandExecutor) SetEventHandlers(
	onStatusChange func(string),
	onModeChange func(string),
	onOutput func(string),
	onError func(error),
) {
	if onStatusChange != nil {
		c.onStatusChange = onStatusChange
	}
	if onModeChange != nil {
		c.onModeChange = onModeChange
	}
	if onOutput != nil {
		c.onOutput = onOutput
	}
	if onError != nil {
		c.onError = onError
	}
}

// Execute はコマンドを実行する
func (c *CommandExecutor) Execute(command string) error {
	// 空コマンドの場合は何もしない
	if strings.TrimSpace(command) == "" {
		return nil
	}

	// セッションモードで実行中の場合はセッションにコマンドを送信
	if c.mode == "session" && c.status == "running" && c.session.IsRunning() {
		// セッションにコマンドを送信（CRを付加）
		err := c.session.Send(command + "\r")
		if err != nil {
			c.setStatus("error")
			c.onError(err)
			return fmt.Errorf("failed to send command to session: %w", err)
		}
		return nil
	}

	// コマンドを解析
	parts := strings.Fields(command)
	if len(parts) == 0 {
		return nil
	}

	// "q" プレフィックスの処理
	isQCommand := parts[0] == "q"
	if isQCommand && len(parts) > 1 {
		// q chat の場合はセッションを開始
		if parts[1] == "chat" {
			return c.startSession("chat")
		}
		// その他のqコマンドは短命コマンドとして実行
		return c.runShortLivedCommand(parts[1:])
	}

	// qプレフィックスなしのコマンドも短命コマンドとして実行
	return c.runShortLivedCommand(parts)
}

// startSession はchatセッションを開始する
func (c *CommandExecutor) startSession(sessionType string) error {
	// ステータスをrunningに変更
	c.setStatus("running")

	// セッションを開始
	err := c.session.Start(sessionType)
	if err != nil {
		c.setStatus("error")
		c.onError(err)
		return fmt.Errorf("failed to start session: %w", err)
	}

	// モードをsessionに変更
	c.setMode("session")

	return nil
}

// runShortLivedCommand は短命コマンドを実行する
func (c *CommandExecutor) runShortLivedCommand(args []string) error {
	// ステータスをrunningに変更
	c.setStatus("running")

	// タイムアウト付きコンテキストを作成
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// コマンドを実行
	output, err := c.execQ.Run(ctx, args)
	if err != nil {
		c.setStatus("error")
		c.onError(err)
		return fmt.Errorf("command execution failed: %w", err)
	}

	// 出力を通知
	if output != "" {
		c.onOutput(output)
	}

	// ステータスをreadyに戻す
	c.setStatus("ready")

	return nil
}

// setStatus はステータスを変更し、イベントを通知する
func (c *CommandExecutor) setStatus(status string) {
	if c.status != status {
		c.status = status
		c.onStatusChange(status)
	}
}

// setMode はモードを変更し、イベントを通知する
func (c *CommandExecutor) setMode(mode string) {
	if c.mode != mode {
		c.mode = mode
		c.onModeChange(mode)
	}
}

// GetMode は現在のモードを取得する
func (c *CommandExecutor) GetMode() string {
	return c.mode
}

// GetStatus は現在のステータスを取得する
func (c *CommandExecutor) GetStatus() string {
	return c.status
}