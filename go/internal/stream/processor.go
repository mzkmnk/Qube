package stream

import (
	"regexp"
	"strings"
)

// OnLinesReady は履歴に確定した行群を受け取るコールバック型
type OnLinesReady func(lines []string)

// OnProgressUpdate は進捗行の更新通知を受け取るコールバック型
// nil は進捗表示のクリアを意味する
type OnProgressUpdate func(line *string)

// Processor はストリーム処理のコアロジックを提供する
// - CR による進捗（スピナー・Loading・Processing 等）を検出
// - Thinking 系は履歴に残さず進捗のみ更新
// - 改行確定時に進捗を 1 回だけ履歴化
// - 直前送信コマンドのエコーバック行を除外
// - 改行のない末尾は内部バッファリング
type Processor struct {
	buffer              string
	currentProgressLine *string
	thinkingActive      bool
	lastSentCommand     *string

	onLinesReady    OnLinesReady
	onProgressUpdate OnProgressUpdate
}

// NewProcessor は Processor を生成する
// onLines は履歴確定行の通知、onProgress は進捗表示の通知を受け取る
func NewProcessor(onLines OnLinesReady, onProgress OnProgressUpdate) *Processor {
	return &Processor{
		onLinesReady:     onLines,
		onProgressUpdate: onProgress,
	}
}

// ProcessData はストリームのデータチャンクを処理する（stdout/stderr 共通）
// CR/ANSI を保持しつつ、思考・進捗・履歴化・エコーバック抑制を行う
func (p *Processor) ProcessData(_type string, data string) {
    // CRLF を \n に正規化（ANSI は保持）
	merged := strings.ReplaceAll(p.buffer+data, "\r\n", "\n")

    // CR による進捗表示の更新処理
	if strings.Contains(merged, "\r") {
		parts := strings.Split(merged, "\r")
		lastPart := parts[len(parts)-1]

        // 進捗パターン（Thinking... は除外）
        spinnerPattern := regexp.MustCompile(`[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*\.{3}`)
        loadingPattern := regexp.MustCompile(`(?i)Loading\.{3}`)
        processingPattern := regexp.MustCompile(`(?i)Processing\.{3}`)
        ioPattern := regexp.MustCompile(`(?i)(Downloading|Uploading|Indexing)`)
        thinkingPattern := regexp.MustCompile(`(?i)Thinking`)

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

    thinkingLine := regexp.MustCompile(`(?i)Thinking`)

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

// GetCurrentProgressLine は現在の進捗行を返す
// 表示中の進捗がなければ nil を返す
func (p *Processor) GetCurrentProgressLine() *string { return p.currentProgressLine }

// SetLastSentCommand は直前に送信したコマンドを設定する
// エコーバック抑制のため、完全一致した行を 1 度だけ除外する
func (p *Processor) SetLastSentCommand(command string) {
	trimmed := strings.TrimSpace(command)
	p.lastSentCommand = &trimmed
}

// Clear は内部バッファと進捗・エコーバック状態をクリアする
func (p *Processor) Clear() {
	p.buffer = ""
	p.currentProgressLine = nil
	p.lastSentCommand = nil
	p.thinkingActive = false
}

// SimplifiedProcessor は簡易API用のプロセッサー
type SimplifiedProcessor struct {
	*Processor
	lines        []string
	progressLine string
}

// NewSimplifiedProcessor は簡易版のProcessorを作成する
func NewSimplifiedProcessor() *SimplifiedProcessor {
	sp := &SimplifiedProcessor{
		lines: []string{},
	}
	sp.Processor = NewProcessor(
		func(lines []string) {
			sp.lines = append(sp.lines, lines...)
		},
		func(line *string) {
			if line != nil {
				sp.progressLine = *line
			} else {
				sp.progressLine = ""
			}
		},
	)
	return sp
}

// Process はデータを処理し、確定した行を返す
func (sp *SimplifiedProcessor) Process(data string) []string {
	sp.lines = []string{} // リセット
	sp.Processor.ProcessData("stdout", data)
	return sp.lines
}

// GetProgressLine は現在の進捗行を返す
func (sp *SimplifiedProcessor) GetProgressLine() string {
	return sp.progressLine
}
