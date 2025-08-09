#!/bin/bash

# Q CLIのインタラクティブな動作を確認するスクリプト

echo "=== Q CLI インタラクティブモードのテスト ==="
echo ""
echo "1. chatモードでの簡単な質問応答をテスト"
echo "---"

# expectコマンドを使用してインタラクティブセッションをシミュレート
cat << 'EOF' | expect -
spawn q chat
expect {
    -re ".*chatting with.*" {
        send "What is 2+2?\r"
        expect -re ".*4.*"
        send "/quit\r"
        expect eof
    }
    timeout {
        puts "Timeout waiting for chat prompt"
        exit 1
    }
}
EOF

echo ""
echo "2. translateモードのテスト"
echo "---"
echo "ファイルをリストする" | q translate

echo ""
echo "3. Q CLIの主要なサブコマンド"
echo "---"
q --help-all | head -30