package session

import (
    "strings"
    "sync"
    "testing"
    "time"
)

// ライフサイクル: Start → Send echo → 受信 → Stop
func Test_Session_Start_Send_Receive_Stop(t *testing.T) {
    s := New()
    defer s.Stop()

    var mu sync.Mutex
    var buf strings.Builder
    done := make(chan struct{}, 1)

    s.OnData = func(b []byte) {
        mu.Lock()
        buf.Write(b)
        if strings.Contains(buf.String(), "hello-session") {
            select { case done <- struct{}{}: default: }
        }
        mu.Unlock()
    }
    s.OnExit = func(code int) {}
    s.OnError = func(err error) { t.Fatalf("session error: %v", err) }

    if err := s.Start("session"); err != nil {
        t.Fatalf("start: %v", err)
    }

    if err := s.Send("echo hello-session"); err != nil {
        t.Fatalf("send: %v", err)
    }

    select {
    case <-done:
        // ok
    case <-time.After(3 * time.Second):
        t.Fatal("did not receive expected output in time")
    }

    if err := s.Stop(); err != nil {
        t.Fatalf("stop: %v", err)
    }
}
