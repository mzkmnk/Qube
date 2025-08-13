package execq

import (
	"os"
	"testing"
)

func TestDetectQCLI_WithQBinEnv(t *testing.T) {
	// Q_BIN環境変数をモック
	originalQBin := os.Getenv("Q_BIN")
	defer os.Setenv("Q_BIN", originalQBin)

	// 存在するコマンドを設定（例: sh）
	os.Setenv("Q_BIN", "sh")
	
	path, err := DetectQCLI()
	if err != nil {
		t.Errorf("Expected no error with Q_BIN=sh, got: %v", err)
	}
	if path == "" {
		t.Error("Expected non-empty path")
	}
}

func TestDetectQCLI_WithInvalidQBinEnv(t *testing.T) {
	// Q_BIN環境変数をモック
	originalQBin := os.Getenv("Q_BIN")
	defer os.Setenv("Q_BIN", originalQBin)

	// 存在しないコマンドを設定
	os.Setenv("Q_BIN", "nonexistent-command-xyz123")
	
	_, err := DetectQCLI()
	if err == nil {
		t.Error("Expected error with invalid Q_BIN")
	}
	expectedMsg := "Q_BIN環境変数で指定されたAmazon Q CLIが見つかりません"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got: %v", expectedMsg, err)
	}
}

func TestDetectQCLI_FallbackToPath(t *testing.T) {
	// Q_BIN環境変数をクリア
	originalQBin := os.Getenv("Q_BIN")
	defer os.Setenv("Q_BIN", originalQBin)
	os.Unsetenv("Q_BIN")

	// この検査は実際のamazonqまたはqがインストールされていない場合、
	// エラーが返ることを確認
	path, err := DetectQCLI()
	
	// amazonqまたはqがインストールされている場合
	if err == nil {
		if path == "" {
			t.Error("Expected non-empty path when command is found")
		}
		t.Logf("Found Q CLI at: %s", path)
	} else {
		// インストールされていない場合
		expectedMsg := "Amazon Q CLIが見つかりません。Q_BIN環境変数を設定するか、amazonqをインストールしてください"
		if err.Error() != expectedMsg {
			t.Errorf("Expected error message '%s', got: %v", expectedMsg, err)
		}
	}
}