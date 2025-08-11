import React from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

export const Output: React.FC<OutputProps> = ({ lines, height, scrollOffset = 0 }) => {
  // 表示する行を決定（最新の行を優先表示）
  let displayLines = lines;

  if (height && height > 0) {
    const totalLines = lines.length;
    if (totalLines > height) {
      const start = totalLines - height;
      displayLines = lines.slice(start);
    }
  }

  return (
    <Box
      flexDirection="column"
      height={height}
      flexGrow={1}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
    >
      {displayLines.length === 0 ? (
        <Text color="gray" dimColor>Waiting for output...</Text>
      ) : (
        displayLines.map((line, index) => (
          <Text key={`${index}-${line.substring(0, 20)}`}>{line}</Text>
        ))
      )}
    </Box>
  );
};
