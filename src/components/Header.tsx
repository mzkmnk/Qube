import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  version: string;
  width?: number;
}

export const Header: React.FC<HeaderProps> = ({ title, version, width }) => {
  // 区切り線の生成
  const separator = width ? '─'.repeat(width) : '─'.repeat(50);

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" width={width}>
        <Text bold color="cyan">{title}</Text>
        <Text color="gray">v{version}</Text>
      </Box>
      <Text>{separator}</Text>
    </Box>
  );
};