import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  mode: "command" | "session";
  status: "ready" | "running" | "error";
  errorCount?: number;
  currentCommand?: string;
  showHelp?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  status,
  errorCount = 0,
  currentCommand,
  showHelp = false,
}) => {
  // ステータス表示を簡潔に
  const getStatusDisplay = () => {
    switch (status) {
      case "error":
        return { icon: "✗", color: "red" };
      case "running":
        return { icon: "◌", color: "yellow" };
      case "ready":
        return { icon: "●", color: "green" };
      default:
        return { icon: "○", color: "gray" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Box justifyContent="space-between" paddingX={1} paddingY={0} marginTop={1}>
      {/* 左側: ステータス情報 */}
      <Box>
        {/* ステータスインジケーター */}
        <Text color={statusDisplay.color}>{statusDisplay.icon} </Text>

        {/* モード表示（シンプル） */}
        <Text color="gray">{mode === "session" ? "Chat" : "Cmd"}</Text>

        {/* ステータス文言（テスト互換のため表示） */}
        <Text color="gray" dimColor>{` ${status}`}</Text>

        {/* エラーカウント */}
        {errorCount > 0 && <Text color="red"> [{errorCount}]</Text>}

        {/* 実行中のコマンド */}
        {status === "running" && currentCommand && (
          <Text color="gray" dimColor>
            {" "}
            •{" "}
            {currentCommand.length > 20
              ? currentCommand.substring(0, 20) + "..."
              : currentCommand}
          </Text>
        )}
      </Box>

      {/* 右側: ショートカットヘルプ（コンパクト） */}
      {showHelp && (
        <Box>
          <Text color="gray" dimColor>
            ^C Stop ^D Exit ^L Clear ↑↓ History
          </Text>
        </Box>
      )}
    </Box>
  );
};
