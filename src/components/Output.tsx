import React from "react";
import { Box, Text } from "ink";

interface OutputProps {
  lines: string[];
  height?: number;
}

/**
 * 出力表示コンポーネント
 * 単一責任: Q CLIの出力を表示するだけ
 */
export const Output: React.FC<OutputProps> = ({ lines, height }) => {
  // 高さ指定がある場合は最新の行を優先表示
  const displayLines =
    height && height > 0 && lines.length > height
      ? lines.slice(-height)
      : lines;

  // ユーザー入力メッセージかどうかを判定
  const isUserMessage = (line: string) => line.startsWith("USER_INPUT:");

  return (
    <Box
      flexDirection="column"
      height={height}
      flexGrow={1}
      paddingX={1}
      paddingY={0}
    >
      {displayLines.length === 0 ? (
        <Text color="gray" dimColor>
          Waiting for output...
        </Text>
      ) : (
        displayLines.map((line, index) => {
          if (isUserMessage(line)) {
            // ユーザー入力は枠組み付きで表示
            const message = line.replace("USER_INPUT:", "").trim();
            return (
              <Box
                key={`${index}-${line.substring(0, 20)}`}
                borderStyle="single"
                borderColor="cyan"
                paddingX={1}
                marginBottom={1}
              >
                <Text color="cyan">▶ {message}</Text>
              </Box>
            );
          } else {
            // 通常の出力
            return (
              <Text key={`${index}-${line.substring(0, 20)}`}>{line}</Text>
            );
          }
        })
      )}
    </Box>
  );
};
