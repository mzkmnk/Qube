package session

import (
    "regexp"
)

// initDetector は ANSI を除去した上で、初期化完了を表すパターンを検知する。
// 文言検知と罫線+空行の2系統に対応。
type initDetector struct {
    buf string
}

var (
    reANSI = regexp.MustCompile(`\x1b\[[0-9;]*[mGKJH]`)
    rePhrase = regexp.MustCompile(`(?i)You are chatting with .+`)
    // Treat sequences of heavy/light box-drawing characters as a separator
    reSep    = regexp.MustCompile(`(?m)[━─]{10,}[\s\S]*?\n\s*\n`)
)

func newInitDetector() *initDetector { return &initDetector{} }

func (d *initDetector) Feed(s string) bool {
    // 入力を連結し、検知用に ANSI を除去
    d.buf += s
    plain := reANSI.ReplaceAllString(d.buf, "")
    if rePhrase.MatchString(plain) {
        return true
    }
    if reSep.MatchString(plain) {
        return true
    }
    return false
}
