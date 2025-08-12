package execq

import (
    "bytes"
    "context"
    "errors"
    "os/exec"
    "time"
)

// Run は短命コマンドを実行し、結合出力(stdout+stderr)、終了コード、エラーを返す。
// タイムアウト時は ("", -1, context.DeadlineExceeded) を返す。
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
        // タイムアウト: Kill して即時リターン
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
        // 上記以外のエラー（起動失敗など）
        return out, -1, err
    }
}
