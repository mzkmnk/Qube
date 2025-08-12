package session

import (
    "testing"
)

func Test_InitializationDetection_ByPhrase(t *testing.T) {
    det := newInitDetector()
    noisy := "\x1b[31mANSI\x1b[0m banner\nYou are chatting with Q Something\n"
    if det.Feed(noisy) {
        // ok
    } else {
        t.Fatal("文言による初期化検知に失敗")
    }
}

func Test_InitializationDetection_BySeparator(t *testing.T) {
    det := newInitDetector()
    // long line of box drawing followed by empty line
    text := "━━━━━━━────────\n\n"
    if det.Feed(text) {
        // ok
    } else {
        t.Fatal("罫線+空行による初期化検知に失敗")
    }
}
