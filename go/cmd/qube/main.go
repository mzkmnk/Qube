package main

import (
    "context"
    "log"
    "time"

    tea "github.com/charmbracelet/bubbletea"
    "qube/internal/execq"
    "qube/internal/executor"
    "qube/internal/session"
    "qube/internal/ui"
)

// execqAdapter はexecq.Runをexecutor.ExecQインターフェースに適合させる
type execqAdapter struct{}

func (e *execqAdapter) Run(ctx context.Context, args []string) (string, error) {
    // contextからタイムアウトを取得、なければデフォルト30秒
    deadline, ok := ctx.Deadline()
    timeout := 30 * time.Second
    if ok {
        timeout = time.Until(deadline)
    }
    
    output, _, err := execq.Run(args, timeout)
    return output, err
}

// sessionAdapter はsession.Sessionをexecutor.Sessionインターフェースに適合させる
type sessionAdapter struct {
    *session.Session
    running bool
}

func (s *sessionAdapter) Start(sessionType string) error {
    err := s.Session.Start(sessionType)
    if err == nil {
        s.running = true
    }
    return err
}

func (s *sessionAdapter) Send(text string) error {
    return s.Session.Send(text)
}

func (s *sessionAdapter) Stop() error {
    err := s.Session.Stop()
    s.running = false
    return err
}

func (s *sessionAdapter) IsRunning() bool {
    return s.running
}

func main() {
    // セッションを作成
    rawSess := session.New()
    sess := &sessionAdapter{Session: rawSess}
    
    // 短命コマンド実行アダプターを作成
    exec := &execqAdapter{}
    
    // CommandExecutorを作成
    cmdExecutor := executor.NewCommandExecutor(sess, exec)
    
    // UIモデルを作成し、CommandExecutorを設定
    m := ui.NewWithExecutor(cmdExecutor)
    
    // セッションからの出力をUIに伝播
    rawSess.OnData = func(data []byte) {
        // TODO: StreamProcessorを通してから追加する必要がある
        m.AddOutput(string(data))
    }
    
    rawSess.OnError = func(err error) {
        m.IncrementErrorCount()
        m.AddOutput("Session Error: " + err.Error())
    }
    
    // 初期化時に自動的にchatセッションを開始
    go func() {
        if err := cmdExecutor.Execute("q chat"); err != nil {
            log.Printf("Failed to start initial chat session: %v", err)
        }
    }()
    
    if _, err := tea.NewProgram(&m).Run(); err != nil {
        log.Fatal(err)
    }
}

