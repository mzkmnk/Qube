package session

import (
    "bufio"
    "errors"
    "io"
    "os"
    "os/exec"
    "runtime"
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

// Start は PTY 上に対話シェルを起動する。
func (s *Session) Start(_mode string) error {
    var shell string
    if runtime.GOOS == "windows" {
        shell = "cmd.exe"
    } else {
        shell = "sh"
    }

    s.cmd = exec.Command(shell, "-i")
    f, err := ptypkg.Start(s.cmd)
    if err != nil {
        return err
    }
    s.pty = f

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
    _, err := s.pty.Write([]byte(text + "\r\n"))
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
