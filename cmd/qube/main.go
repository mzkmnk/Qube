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

// execqAdapter はexecq.RunQをexecutor.ExecQインターフェースに適合させる
type execqAdapter struct{}

func (e *execqAdapter) Run(ctx context.Context, args []string) (string, error) {
    // contextからタイムアウトを取得、なければデフォルト30秒
    deadline, ok := ctx.Deadline()
    timeout := 30 * time.Second
    if ok {
        timeout = time.Until(deadline)
    }
    
    // Q CLIコマンドを実行（"q"で始まる場合は自動的にバイナリパスを検出）
    output, _, err := execq.RunQ(args, timeout)
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
    // 起動時に即座に接続状態をtrueに設定
    m.SetConnected(true)

    // Program を先に作成して、goroutine から安全に UI を更新する
    // マウスサポートを有効にしてviewportのスクロールを可能にする
    p := tea.NewProgram(&m, tea.WithMouseCellMotion())

    // セッションからの出力をStreamProcessor経由でUIに伝播（Program.Send 経由）
    rawSess.OnData = func(data []byte) {
        lines := processor.Process(string(data))
        for _, line := range lines {
            p.Send(ui.MsgAddOutput{Line: line})
        }
        // progressLineの処理
        if progressLine := processor.GetProgressLine(); progressLine != "" {
            p.Send(ui.MsgSetProgress{Line: progressLine, Clear: false})
        } else {
            p.Send(ui.MsgSetProgress{Clear: true})
        }
    }

    rawSess.OnError = func(err error) {
        p.Send(ui.MsgIncrementError{})
        p.Send(ui.MsgAddOutput{Line: "Session Error: " + err.Error()})
    }

    // イベントハンドラーを設定（UIのSetExecutorを上書き）
    cmdExecutor.SetEventHandlers(
        func(status string) {
            switch status {
            case "ready":
                p.Send(ui.MsgSetStatus{S: ui.StatusReady})
                // セッションモードでは常に入力を有効化
                if cmdExecutor.GetMode() == "session" {
                    p.Send(ui.MsgSetInputEnabled{Enabled: true})
                } else {
                    p.Send(ui.MsgSetInputEnabled{Enabled: true})
                }
            case "running":
                p.Send(ui.MsgSetStatus{S: ui.StatusRunning})
                // セッション実行中は入力有効（チャット入力を許可）
                if cmdExecutor.GetMode() == "session" {
                    p.Send(ui.MsgSetInputEnabled{Enabled: true})
                } else {
                    p.Send(ui.MsgSetInputEnabled{Enabled: false})
                }
            case "error":
                p.Send(ui.MsgSetStatus{S: ui.StatusError})
                p.Send(ui.MsgSetInputEnabled{Enabled: true})
            }
        },
        func(mode string) {
            if mode == "session" {
                p.Send(ui.MsgSetMode{M: ui.ModeSession})
                // 画面クリア → 初期化（React Inkの流れに合わせる）
                processor.Clear()
                p.Send(ui.MsgClearScreen{})
                // 初期化までは Connecting のまま
                p.Send(ui.MsgSetConnected{Connected: false})
                // チャット入力を即有効
                p.Send(ui.MsgSetInputEnabled{Enabled: true})
            } else {
                p.Send(ui.MsgSetMode{M: ui.ModeCommand})
            }
        },
        func(output string) {
            // 短命コマンドの出力はそのまま追加
            p.Send(ui.MsgAddOutput{Line: output})
        },
        func(err error) {
            p.Send(ui.MsgIncrementError{})
            p.Send(ui.MsgAddOutput{Line: "Error: " + err.Error()})
        },
    )

    // セッション初期化完了で Connected に切替、status を ready に戻す
    rawSess.OnInitialized = func() {
        // 初期化完了で Connected/ready へ切替
        p.Send(ui.MsgSetConnected{Connected: true})
        p.Send(ui.MsgSetStatus{S: ui.StatusReady})
    }

    // 初期化時に自動的にchatセッションを開始
    go func() {
        if err := cmdExecutor.Execute("q chat"); err != nil {
            log.Printf("Failed to start initial chat session: %v", err)
        }
    }()

    if _, err := p.Run(); err != nil {
        log.Fatal(err)
    }
}