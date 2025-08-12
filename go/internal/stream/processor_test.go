package stream

import (
    "os"
    "path/filepath"
    "strings"
    "testing"
)

func readFileLines(t *testing.T, p string) []string {
	t.Helper()
	data, err := os.ReadFile(p)
	if err != nil { t.Fatalf("read %s: %v", p, err) }
	s := string(data)
    // 行末を \n に正規化
	s = strings.ReplaceAll(s, "\r\n", "\n")
    // 最後の改行は比較しやすいように除去（行単位で比較）
	if strings.HasSuffix(s, "\n") {
		s = s[:len(s)-1]
	}
	if s == "" { return []string{} }
	return strings.Split(s, "\n")
}

func streamAll(t *testing.T, processor *Processor, input string) []string {
	t.Helper()
	var out []string
	onLines := func(lines []string) { out = append(out, lines...) }
	processor.onLinesReady = onLines
	processor.onProgressUpdate = func(_ *string) {}
	for i := 0; i < len(input); i++ {
		processor.ProcessData("stdout", string(input[i]))
	}
	return out
}

func Test_FixturesMatchGolden(t *testing.T) {
	root, err := os.Getwd()
	if err != nil { t.Fatal(err) }
    // go/internal/stream 配下で動くことを想定し、リポジトリルートを解決
	var repoRoot string
	if strings.HasSuffix(root, filepath.Join("go", "internal", "stream")) {
		repoRoot = strings.TrimSuffix(root, filepath.Join("go", "internal", "stream"))
	} else {
		repoRoot = root
	}

	streamsDir := filepath.Join(repoRoot, "fixtures", "streams")
	goldenDir := filepath.Join(repoRoot, "fixtures", "golden")

	d, err := os.ReadDir(streamsDir)
	if err != nil { t.Fatalf("read dir: %v", err) }

	for _, ent := range d {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ".txt") { continue }
		name := ent.Name()
		streamPath := filepath.Join(streamsDir, name)
		goldenPath := filepath.Join(goldenDir, name)

        // 改行の有無を保持するためバイト列で読み込む
        rawBytes, err := os.ReadFile(streamPath)
        if err != nil { t.Fatalf("read %s: %v", streamPath, err) }
        raw := string(rawBytes)

        // Node のジェネレータと同じ規則で入力ストリームを構築:
        // - 改行境界で分割し、改行の有無を保持
        // - 改行前のテキストに対しディレクティブ/コメント処理
        // - 元の行に改行があった場合のみ改行を付与
        var stream strings.Builder
        processor := NewProcessor(nil, nil)

        var buf strings.Builder
        for i := 0; i < len(raw); i++ {
            ch := raw[i]
            if ch == '\n' {
                text := buf.String()
                buf.Reset()
                if strings.HasPrefix(text, ">>SET_LAST_CMD: ") {
                    cmd := strings.TrimPrefix(text, ">>SET_LAST_CMD: ")
                    processor.SetLastSentCommand(cmd)
                    continue
                }
                if strings.HasPrefix(text, "#") {
                    continue
                }
                stream.WriteString(text)
                stream.WriteString("\n")
                continue
            }
            buf.WriteByte(ch)
        }
        // 最後の未改行セグメントを処理
        if rem := buf.String(); rem != "" {
            if strings.HasPrefix(rem, ">>SET_LAST_CMD: ") {
                cmd := strings.TrimPrefix(rem, ">>SET_LAST_CMD: ")
                processor.SetLastSentCommand(cmd)
            } else if !strings.HasPrefix(rem, "#") {
                stream.WriteString(rem)
            }
        }

        in := stream.String()

		got := streamAll(t, processor, in)
		want := readFileLines(t, goldenPath)

		if len(got) != len(want) {
			t.Fatalf("%s: line count mismatch: got %d, want %d\nGOT:\n%v\nWANT:\n%v", name, len(got), len(want), got, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("%s: line %d mismatch:\nGOT:  %q\nWANT: %q", name, i+1, got[i], want[i])
			}
		}
	}
}
