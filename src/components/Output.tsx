import React from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

// コードブロックやマークダウンの検出とスタイリング
const formatLine = (line: string): React.ReactNode => {
  // コードブロックの検出
  if (line.startsWith('```')) {
    return <Text color="yellow" dimColor>{line}</Text>;
  }
  
  // プロンプト行の検出とスタイリング（ユーザー入力）
  if (line.startsWith('💬')) {
    return (
      <Box>
        <Text color="cyan">▶ </Text>
        <Text bold color="white">{line.substring(2).trim()}</Text>
      </Box>
    );
  }
  
  // AIレスポンスの開始
  if (line.startsWith('🤖')) {
    return (
      <Box>
        <Text color="magenta">◆ </Text>
        <Text color="white">{line.substring(2).trim()}</Text>
      </Box>
    );
  }
  
  // エラーメッセージ
  if (line.startsWith('❌')) {
    return (
      <Box>
        <Text color="red">✗ </Text>
        <Text color="red">{line.substring(1).trim()}</Text>
      </Box>
    );
  }
  
  // 成功メッセージ
  if (line.startsWith('✅')) {
    return (
      <Box>
        <Text color="green">✓ </Text>
        <Text color="green">{line.substring(1).trim()}</Text>
      </Box>
    );
  }
  
  // 開始メッセージ
  if (line.startsWith('✨')) {
    return (
      <Box>
        <Text color="yellow">◈ </Text>
        <Text color="yellow">{line.substring(1).trim()}</Text>
      </Box>
    );
  }
  
  // 警告メッセージ
  if (line.startsWith('⚠️')) {
    return (
      <Box>
        <Text color="yellow">⚠ </Text>
        <Text color="yellow">{line.substring(2).trim()}</Text>
      </Box>
    );
  }
  
  // 情報メッセージ（アイコン付き）
  if (line.startsWith('🚀')) {
    return (
      <Box marginY={1}>
        <Text bold color="magenta">{line}</Text>
      </Box>
    );
  }
  
  // セパレーター
  if (line.match(/^[━─═]+$/)) {
    return <Text dimColor>{line}</Text>;
  }
  
  // コンテンツのインデント
  if (line.startsWith('  ')) {
    return <Text color="gray">{line}</Text>;
  }
  
  // デフォルト
  return <Text>{line}</Text>;
};

export const Output: React.FC<OutputProps> = ({ lines, height, scrollOffset = 0 }) => {
  // 表示する行を決定（最新の行を優先表示）
  let displayLines = lines;
  
  if (height && height > 0) {
    // 自動スクロール：最新の行を表示
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
          <Box key={`${index}-${line.substring(0, 10)}`}>
            {formatLine(line)}
          </Box>
        ))
      )}
    </Box>
  );
};
