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
	// Normalize line endings to \n
	s = strings.ReplaceAll(s, "\r\n", "\n")
	// Trim trailing newline for comparison granularity; we will compare line-by-line
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
	// Move up to repo root if we're under go/internal/stream
	// We assume repo structure with top-level fixtures/
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

        // Read stream file as raw bytes to preserve newline semantics
        rawBytes, err := os.ReadFile(streamPath)
        if err != nil { t.Fatalf("read %s: %v", streamPath, err) }
        raw := string(rawBytes)

        // Build input stream exactly like the Node generator:
        // - Split by newline boundaries, detect whether each line had a trailing newline
        // - Apply directives/comments to the pre-newline text
        // - Append newline only when the original line had one
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
        // Handle final segment without newline
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
