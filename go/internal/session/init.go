package session

import (
    "regexp"
)

// initDetector strips ANSI and detects initialization completion
// by phrase or separator+blankline.
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
    // Append and strip ANSI on the fly for detection
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
