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

// ProcessData processes incoming stream data chunk (stdout/stderr agnostic)
func (p *Processor) ProcessData(_type string, data string) {
	// CRLF normalization (keep ANSI as-is)
	merged := strings.ReplaceAll(p.buffer+data, "\r\n", "\n")

	// Handle carriage return progress updates
	if strings.Contains(merged, "\r") {
		parts := strings.Split(merged, "\r")
		lastPart := parts[len(parts)-1]

		// Progress patterns (excluding Thinking...)
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

		// Continue processing only with latest content
		merged = lastPart
	}

	parts := strings.Split(merged, "\n")
	incomplete := parts[len(parts)-1]
	parts = parts[:len(parts)-1]

	var linesToAdd []string

	// If a progress line exists and at least one newline arrived, flush it once (excluding Thinking)
	if len(parts) > 0 && p.currentProgressLine != nil && !p.thinkingActive {
		linesToAdd = append(linesToAdd, *p.currentProgressLine)
		p.currentProgressLine = nil
		if p.onProgressUpdate != nil { p.onProgressUpdate(nil) }
	}

	thinkingLine := regexp.MustCompile("(?i)Thinking")

	for _, line := range parts {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			// Skip empty lines (may be echo artifacts)
			continue
		}

		if thinkingLine.MatchString(trimmed) {
			p.thinkingActive = true
			val := "Thinking..."
			p.currentProgressLine = &val
			if p.onProgressUpdate != nil { p.onProgressUpdate(p.currentProgressLine) }
			continue
		}

		// Transition away from Thinking when normal output arrives
		if p.thinkingActive {
			p.thinkingActive = false
			p.currentProgressLine = nil
			if p.onProgressUpdate != nil { p.onProgressUpdate(nil) }
		}

		// Echo-back suppression: exact match with lastSentCommand
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
