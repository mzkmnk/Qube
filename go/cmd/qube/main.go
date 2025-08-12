package main

import (
    "context"
    "log"
    "time"

    tea "github.com/charmbracelet/bubbletea"
    "qube/internal/execq"
    "qube/internal/executor"
    "qube/internal/session"
    "qube/internal/stream"
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
    processor *stream.SimplifiedProcessor
}

func (s *sessionAdapter) Start(sessionType string) error {
    err := s.Session.Start(sessionType)
    if err == nil {
        s.running = true
    }
    return err
}

func (s *sessionAdapter) Send(text string) error {
    // エコーバック抑制のためにprocessorに送信コマンドを記録
    if s.processor != nil {
        s.processor.SetLastSentCommand(text)
    }
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
    // StreamProcessorを作成
    processor := stream.NewSimplifiedProcessor()
    processor.SetLastSentCommand("") // 初期値設定
    
    // セッションを作成
    rawSess := session.New()
    sess := &sessionAdapter{
        Session: rawSess,
        processor: processor,
    }
    
    // 短命コマンド実行アダプターを作成
    exec := &execqAdapter{}
    
    // CommandExecutorを作成
    cmdExecutor := executor.NewCommandExecutor(sess, exec)
    
    // UIモデルを作成し、CommandExecutorを設定
    m := ui.NewWithExecutor(cmdExecutor)
    
    // セッションからの出力をStreamProcessor経由でUIに伝播
    rawSess.OnData = func(data []byte) {
        lines := processor.Process(string(data))
        for _, line := range lines {
            m.AddOutput(line)
        }
        // progressLineの処理
        if progressLine := processor.GetProgressLine(); progressLine != "" {
            m.SetProgressLine(progressLine)
        }
    }
    
    rawSess.OnError = func(err error) {
        m.IncrementErrorCount()
        m.AddOutput("Session Error: " + err.Error())
    }
    
    // イベントハンドラーを設定（UIのSetExecutorを上書き）
    cmdExecutor.SetEventHandlers(
        func(status string) {
            // UIの既存処理を維持
            switch status {
            case "ready":
                m.SetStatus(ui.StatusReady)
                m.SetInputEnabled(true)
            case "running":
                m.SetStatus(ui.StatusRunning)
                m.SetInputEnabled(false)
            case "error":
                m.SetStatus(ui.StatusError)
                m.SetInputEnabled(true)
            }
        },
        func(mode string) {
            // UIの既存処理を維持
            if mode == "session" {
                m.SetMode(ui.ModeSession)
            } else {
                m.SetMode(ui.ModeCommand)
            }
        },
        func(output string) {
            // 短命コマンドの出力はそのまま追加
            m.AddOutput(output)
        },
        func(err error) {
            // UIの既存処理を維持
            m.IncrementErrorCount()
            m.AddOutput("Error: " + err.Error())
        },
    )
    
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

