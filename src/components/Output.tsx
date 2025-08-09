import React from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

export const Output: React.FC<OutputProps> = ({ lines, height, scrollOffset = 0 }) => {
  // 表示する行を決定
  let displayLines = lines;
  
  if (height && height > 0) {
    // スクロールオフセットを適用
    const start = scrollOffset;
    const end = start + height;
    displayLines = lines.slice(start, end);
  }

  return (
    <Box flexDirection="column" height={height} flexGrow={1} borderStyle="single" paddingX={1}>
      {displayLines.map((line, index) => (
        <Text key={`${index}-${line.substring(0, 10)}`}>{line}</Text>
      ))}
    </Box>
  );
};