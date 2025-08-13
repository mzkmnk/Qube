package execq

import (
	"errors"
	"os"
	"os/exec"
)

// DetectQCLI はAmazon Q CLIのバイナリパスを検出する
// 検出優先順位:
// 1. Q_BIN環境変数
// 2. PATHから'amazonq'
// 3. PATHから'q'
func DetectQCLI() (string, error) {
	// Q_BIN環境変数が設定されている場合
	if qBin := os.Getenv("Q_BIN"); qBin != "" {
		// 環境変数で指定されたパスが実行可能か確認
		if path, err := exec.LookPath(qBin); err == nil {
			return path, nil
		}
		return "", errors.New("Q_BIN環境変数で指定されたAmazon Q CLIが見つかりません")
	}

	// PATHから検索
	candidates := []string{"amazonq", "q"}
	for _, candidate := range candidates {
		if path, err := exec.LookPath(candidate); err == nil {
			return path, nil
		}
	}

	// すべての候補が見つからなかった場合
	return "", errors.New("Amazon Q CLIが見つかりません。Q_BIN環境変数を設定するか、amazonqをインストールしてください")
}