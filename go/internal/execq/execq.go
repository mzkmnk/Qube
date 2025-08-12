package execq

import (
    "bytes"
    "context"
    "errors"
    "os/exec"
    "time"
)

// Run executes a short-lived command and returns combined stdout+stderr,
// exit code, and error. On timeout, returns ("", -1, context.DeadlineExceeded).
func Run(args []string, timeout time.Duration) (string, int, error) {
    if len(args) == 0 {
        return "", -1, errors.New("no command provided")
    }
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    cmd := exec.CommandContext(ctx, args[0], args[1:]...)

    var buf bytes.Buffer
    cmd.Stdout = &buf
    cmd.Stderr = &buf

    if err := cmd.Start(); err != nil {
        return "", -1, err
    }

    done := make(chan error, 1)
    go func() { done <- cmd.Wait() }()

    select {
    case <-ctx.Done():
        // Timeout: kill and return quickly
        _ = cmd.Process.Kill()
        return "", -1, context.DeadlineExceeded
    case err := <-done:
        out := buf.String()
        if err == nil {
            return out, 0, nil
        }
        if exitErr, ok := err.(*exec.ExitError); ok {
            return out, exitErr.ExitCode(), err
        }
        return out, -1, err
    }
}
