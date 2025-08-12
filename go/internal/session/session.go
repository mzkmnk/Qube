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

type Session struct {
    cmd   *exec.Cmd
    pty   *os.File
    once  sync.Once

    OnData func([]byte)
    OnExit func(int)
    OnError func(error)
}

func New() *Session { return &Session{} }

// Start launches an interactive shell under a PTY.
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

    // Reader goroutine
    go func() {
        r := bufio.NewReader(f)
        buf := make([]byte, 4096)
        for {
            n, err := r.Read(buf)
            if n > 0 && s.OnData != nil {
                // Copy to avoid retaining large backing array
                b := make([]byte, n)
                copy(b, buf[:n])
                s.OnData(b)
            }
            if err != nil {
                if errors.Is(err, io.EOF) {
                    // Wait for exit to report code
                    return
                }
                if s.OnError != nil {
                    s.OnError(err)
                }
                return
            }
        }
    }()

    // Wait goroutine
    go func() {
        err := s.cmd.Wait()
        code := 0
        if err != nil {
            if exitErr, ok := err.(*exec.ExitError); ok {
                code = exitErr.ExitCode()
            } else {
                // Unknown error
                if s.OnError != nil { s.OnError(err) }
                code = -1
            }
        }
        if s.OnExit != nil { s.OnExit(code) }
    }()

    return nil
}

// Send writes a line to the PTY.
func (s *Session) Send(text string) error {
    if s.pty == nil { return errors.New("session not started") }
    _, err := s.pty.Write([]byte(text + "\r\n"))
    return err
}

// Stop terminates the session.
func (s *Session) Stop() error {
    var err error
    s.once.Do(func() {
        if s.pty != nil {
            _ = s.pty.Close()
        }
        if s.cmd != nil && s.cmd.Process != nil {
            // Try graceful then kill
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

