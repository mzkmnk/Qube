package stream

import (
	"regexp"
	"strings"
)

type OnLinesReady func(lines []string)

type OnProgressUpdate func(line *string)

type Processor struct {
	buffer              string
	currentProgressLine *string
	thinkingActive      bool
	lastSentCommand     *string

	onLinesReady    OnLinesReady
	onProgressUpdate OnProgressUpdate
}

func NewProcessor(onLines OnLinesReady, onProgress OnProgressUpdate) *Processor {
	return &Processor{
		onLinesReady:     onLines,
		onProgressUpdate: onProgress,
	}
}

// ProcessData はストリームのデータチャンクを処理する（stdout/stderr 共通）
func (p *Processor) ProcessData(_type string, data string) {
    // CRLF を \n に正規化（ANSI は保持）
	merged := strings.ReplaceAll(p.buffer+data, "\r\n", "\n")

    // CR による進捗表示の更新処理
	if strings.Contains(merged, "\r") {
		parts := strings.Split(merged, "\r")
		lastPart := parts[len(parts)-1]

        // 進捗パターン（Thinking... は除外）
		spinnerPattern := regexp.MustCompile("[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*\\.{3}")
		loadingPattern := regexp.MustCompile("(?i)Loading\\.\\.\\.")
		processingPattern := regexp.MustCompile("(?i)Processing\\.\\.\\.")
		ioPattern := regexp.MustCompile("(?i)(Downloading|Uploading|Indexing)")
		thinkingPattern := regexp.MustCompile("(?i)Thinking")

		if thinkingPattern.MatchString(lastPart) {
			p.thinkingActive = true
			val := "Thinking..."
			p.currentProgressLine = &val
			if p.onProgressUpdate != nil { p.onProgressUpdate(p.currentProgressLine) }
		} else if spinnerPattern.MatchString(lastPart) || loadingPattern.MatchString(lastPart) || processingPattern.MatchString(lastPart) || ioPattern.MatchString(lastPart) {
			p.thinkingActive = false
			val := strings.TrimSpace(lastPart)
			p.currentProgressLine = &val
			if p.onProgressUpdate != nil { p.onProgressUpdate(p.currentProgressLine) }
		}

        // 以降の処理は最新内容（lastPart）のみに限定
		merged = lastPart
	}

	parts := strings.Split(merged, "\n")
	incomplete := parts[len(parts)-1]
	parts = parts[:len(parts)-1]

	var linesToAdd []string

    // 進捗行があり改行が入ったら1度だけ履歴に確定（Thinking は除外）
	if len(parts) > 0 && p.currentProgressLine != nil && !p.thinkingActive {
		linesToAdd = append(linesToAdd, *p.currentProgressLine)
		p.currentProgressLine = nil
		if p.onProgressUpdate != nil { p.onProgressUpdate(nil) }
	}

	thinkingLine := regexp.MustCompile("(?i)Thinking")

	for _, line := range parts {
		trimmed := strings.TrimSpace(line)
        if trimmed == "" {
            // 空行はスキップ（エコーバック直後の可能性あり）
			continue
		}

		if thinkingLine.MatchString(trimmed) {
			p.thinkingActive = true
			val := "Thinking..."
			p.currentProgressLine = &val
			if p.onProgressUpdate != nil { p.onProgressUpdate(p.currentProgressLine) }
			continue
		}

        // 通常出力が来たら Thinking 表示を解除
		if p.thinkingActive {
			p.thinkingActive = false
			p.currentProgressLine = nil
			if p.onProgressUpdate != nil { p.onProgressUpdate(nil) }
		}

        // エコーバック抑制: lastSentCommand と完全一致なら除外
		if p.lastSentCommand != nil && trimmed == *p.lastSentCommand {
			p.lastSentCommand = nil
			continue
		}

		linesToAdd = append(linesToAdd, line)
	}

	p.buffer = incomplete

	if len(linesToAdd) > 0 && p.onLinesReady != nil {
		p.onLinesReady(linesToAdd)
	}
}

func (p *Processor) GetCurrentProgressLine() *string { return p.currentProgressLine }

func (p *Processor) SetLastSentCommand(command string) {
	trimmed := strings.TrimSpace(command)
	p.lastSentCommand = &trimmed
}

func (p *Processor) Clear() {
	p.buffer = ""
	p.currentProgressLine = nil
	p.lastSentCommand = nil
	p.thinkingActive = false
}
