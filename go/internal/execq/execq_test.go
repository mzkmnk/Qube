package execq

import (
    "context"
    "errors"
    "runtime"
    "strings"
    "testing"
    "time"
)

// Windows 環境ではシェル実行の挙動差が大きいためスキップ
func requireUnix(t *testing.T) {
    t.Helper()
    if runtime.GOOS == "windows" {
        t.Skip("skip on windows")
    }
}

func Test_Run_Success_OutputAndExitCode(t *testing.T) {
    requireUnix(t)
    out, code, err := Run([]string{"/bin/echo", "hello"}, 5*time.Second)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if code != 0 {
        t.Fatalf("exit code: got %d want 0", code)
    }
    if strings.TrimSpace(out) != "hello" {
        t.Fatalf("output mismatch: %q", out)
    }
}

func Test_Run_CombinedStdoutStderr(t *testing.T) {
    requireUnix(t)
    out, code, err := Run([]string{"/bin/sh", "-c", "echo out; echo err 1>&2"}, 5*time.Second)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if code != 0 {
        t.Fatalf("exit code: got %d want 0", code)
    }
    got := strings.TrimSpace(out)
    if got != "out\nerr" {
        t.Fatalf("combined output mismatch: %q", got)
    }
}

func Test_Run_Timeout(t *testing.T) {
    requireUnix(t)
    start := time.Now()
    out, code, err := Run([]string{"/bin/sh", "-c", "sleep 2; echo done"}, 300*time.Millisecond)
    if err == nil {
        t.Fatalf("expected timeout error, got nil")
    }
    if !errors.Is(err, context.DeadlineExceeded) {
        t.Fatalf("expected context.DeadlineExceeded, got %v", err)
    }
    if code != -1 {
        t.Fatalf("exit code: got %d want -1 (timeout)", code)
    }
    if out != "" { // 実装ではタイムアウト時の出力は捨てる
        t.Fatalf("expected empty output on timeout, got %q", out)
    }
    if time.Since(start) > time.Second {
        t.Fatalf("timeout did not cancel quickly")
    }
}

func Test_Run_NonZeroExitCode(t *testing.T) {
    requireUnix(t)
    out, code, err := Run([]string{"/bin/sh", "-c", "echo err 1>&2; exit 7"}, 5*time.Second)
    if err == nil {
        t.Fatalf("expected error for non-zero exit, got nil")
    }
    // Ensure it's not a timeout
    if errors.Is(err, context.DeadlineExceeded) {
        t.Fatalf("unexpected timeout error")
    }
    if code != 7 {
        t.Fatalf("exit code: got %d want 7", code)
    }
    if strings.TrimSpace(out) != "err" {
        t.Fatalf("combined output mismatch: %q", out)
    }
}
