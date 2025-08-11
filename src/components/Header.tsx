import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title: string;
  version: string;
  width?: number;
  connected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  version,
  width = 60,
  connected = false,
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* メインヘッダー - よりミニマルでモダンなデザイン */}
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
          <Box>
            <Text color="magenta" bold>
              ◆{" "}
            </Text>
            <Text color="white" bold>
              {title}
            </Text>
            <Text color="gray"> v{version}</Text>
          </Box>
          <Box>
            <Text color={connected ? "green" : "yellow"}>
              {connected ? "● Connected" : "○ Connecting..."}
            </Text>
          </Box>
        </Box>

        {/* サブタイトル */}
        <Box paddingX={1}>
          <Text color="gray" dimColor>
            Amazon Q CLI Enhanced Interface
          </Text>
        </Box>

        {/* セパレーター - よりシンプルなライン */}
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>{"─".repeat(width)}</Text>
        </Box>
      </Box>
    </Box>
  );
};
