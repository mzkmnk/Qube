import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  mode: 'command' | 'session';
  status: 'ready' | 'running' | 'error';
  errorCount?: number;
  currentCommand?: string;
  showHelp?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  mode, 
  status, 
  errorCount = 0,
  currentCommand,
  showHelp = false 
}) => {
  // ステータスの色を決定
  const statusColor = status === 'error' ? 'red' : status === 'running' ? 'yellow' : 'green';

  return (
    <Box justifyContent="space-between" borderStyle="single" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false}>
      <Box>
        <Text color="blue">[{mode}]</Text>
        <Text> </Text>
        <Text color={statusColor}>{status}</Text>
        {currentCommand && (
          <>
            <Text> </Text>
            <Text color="cyan">{currentCommand}</Text>
          </>
        )}
        {errorCount > 0 && (
          <>
            <Text> </Text>
            <Text color="red">Errors: {errorCount}</Text>
          </>
        )}
      </Box>
      {showHelp && (
        <Box>
          <Text color="gray">Ctrl+C: Cancel | Ctrl+D: Exit | Ctrl+L: Clear</Text>
        </Box>
      )}
    </Box>
  );
};