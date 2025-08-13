package session

import (
    "bufio"
    "errors"
    "io"
    "os"
    "os/exec"
    "sync"
    "syscall"
    "time"

    ptypkg "github.com/creack/pty"
)

// Session は PTY 上で実行されるインタラクティブシェルを管理する。
type Session struct {
    cmd   *exec.Cmd
    pty   *os.File
    once  sync.Once

    OnData  func([]byte) // シェル出力受信時に呼ばれる
    OnExit  func(int)    // プロセス終了時に終了コード付きで呼ばれる
    OnError func(error)  // 受信/待機中のエラー通知
}

func New() *Session { return &Session{} }

// detectQCLI はAmazon Q CLIのバイナリパスを検出する（内部使用）
func detectQCLI() (string, error) {
    // Q_BIN環境変数が設定されている場合
    if qBin := os.Getenv("Q_BIN"); qBin != "" {
        if path, err := exec.LookPath(qBin); err == nil {
            return path, nil
        }
        return "", errors.New("Q_BIN環境変数で指定されたAmazon Q CLIが見つかりません")
    }

    // PATHから検索
    candidates := []string{"amazonq", "q"}
    for _, candidate := range candidates {
        if path, err := exec.LookPath(candidate); err == nil {
            return path, nil
        }
    }

    return "", errors.New("Amazon Q CLIが見つかりません。Q_BIN環境変数を設定するか、amazonqをインストールしてください")
}

// Start は PTY 上にQ CLIセッションを起動する。
func (s *Session) Start(mode string) error {
    // Q CLIバイナリパスを検出
    qPath, err := detectQCLI()
    if err != nil {
        return err
    }

    // modeに応じたコマンドを構築（現在はchatのみ対応）
    var args []string
    switch mode {
    case "chat":
        args = []string{qPath, "chat"}
    default:
        args = []string{qPath, mode}
    }

    s.cmd = exec.Command(args[0], args[1:]...)
    // Node版と同様にTERMを明示
    s.cmd.Env = append(os.Environ(), "TERM=xterm-256color")
    f, err := ptypkg.Start(s.cmd)
    if err != nil {
        return err
    }
    s.pty = f

    // デフォルトのPTYサイズを指定（Node版: cols=80, rows=30）
    _ = ptypkg.Setsize(s.pty, &ptypkg.Winsize{Rows: 30, Cols: 80})

    // Reader ゴルーチン
    go func() {
        r := bufio.NewReader(f)
        buf := make([]byte, 4096)
        for {
            n, err := r.Read(buf)
            if n > 0 && s.OnData != nil {
                // バッファ使い回しによる裏配列共有を避けるためコピー
                b := make([]byte, n)
                copy(b, buf[:n])
                s.OnData(b)
            }
            if err != nil {
                if errors.Is(err, io.EOF) {
                    // 終了コードは Wait ゴルーチンで通知
                    return
                }
                if s.OnError != nil {
                    s.OnError(err)
                }
                return
            }
        }
    }()

    // Wait ゴルーチン
    go func() {
        err := s.cmd.Wait()
        code := 0
        if err != nil {
            if exitErr, ok := err.(*exec.ExitError); ok {
                code = exitErr.ExitCode()
            } else {
                // 不明なエラー
                if s.OnError != nil { s.OnError(err) }
                code = -1
            }
        }
        if s.OnExit != nil { s.OnExit(code) }
    }()

    return nil
}

// Send は PTY に 1 行書き込む（CRLF 付与）。
func (s *Session) Send(text string) error {
    if s.pty == nil { return errors.New("session not started") }
    // Node版は input+"\r" を送信している
    // Go版も同等にするため、引数をそのまま書き出す
    _, err := s.pty.Write([]byte(text))
    return err
}

// Stop はセッションを終了する（TERM→Kill フォールバック）。
func (s *Session) Stop() error {
    var err error
    s.once.Do(func() {
        if s.pty != nil {
            _ = s.pty.Close()
        }
        if s.cmd != nil && s.cmd.Process != nil {
            // まず TERM、一定時間で Kill
            _ = s.cmd.Process.Signal(syscall.SIGTERM)
            timer := time.NewTimer(300 * time.Millisecond)
            done := make(chan struct{})
            go func() {
                s.cmd.Wait()
                close(done)
            }()
            select {
            case <-done:
            case <-timer.C:
                _ = s.cmd.Process.Kill()
            }
        }
    })
    return err
}
