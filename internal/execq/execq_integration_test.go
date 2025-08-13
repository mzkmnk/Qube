package execq

import (
	"os"
	"strings"
	"testing"
	"time"
)

// TestRunQ_ActualQCLI は実際のQ CLIを使用した統合テスト
func TestRunQ_ActualQCLI(t *testing.T) {
	// Q CLIが存在しない場合はスキップ
	if _, err := DetectQCLI(); err != nil {
		t.Skipf("Q CLI not found: %v", err)
	}

	// "q help" コマンドを実行
	output, exitCode, err := RunQ([]string{"q", "help"}, 5*time.Second)
	
	if err != nil {
		t.Fatalf("RunQ failed: %v", err)
	}
	
	// 正常終了を確認
	if exitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", exitCode)
	}
	
	// 出力に "Amazon Q" または "Commands:" が含まれることを確認
	if !strings.Contains(output, "Amazon Q") && !strings.Contains(output, "Commands:") {
		t.Errorf("Output doesn't look like Q CLI help: %s", output)
	}
}

// TestRunQ_WithQBinEnv は環境変数Q_BINを使用したテスト
func TestRunQ_WithQBinEnv(t *testing.T) {
	// 元の環境変数を保存
	originalQBin := os.Getenv("Q_BIN")
	defer os.Setenv("Q_BIN", originalQBin)
	
	// Q CLIが存在しない場合はスキップ
	qPath, err := DetectQCLI()
	if err != nil {
		t.Skipf("Q CLI not found: %v", err)
	}
	
	// Q_BINを設定
	os.Setenv("Q_BIN", qPath)
	
	// "q help" コマンドを実行
	output, exitCode, err := RunQ([]string{"q", "help"}, 5*time.Second)
	
	if err != nil {
		t.Fatalf("RunQ with Q_BIN failed: %v", err)
	}
	
	if exitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", exitCode)
	}
	
	if !strings.Contains(output, "Amazon Q") && !strings.Contains(output, "Commands:") {
		t.Errorf("Output doesn't look like Q CLI help: %s", output)
	}
}