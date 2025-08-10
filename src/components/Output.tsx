import React from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

// コードブロックやマークダウンの検出とスタイリング
const formatLine = (line: string): React.ReactNode => {
  // Amazon Q CLI Tools関連の出力を処理
  
  // Tool使用開始（🛠️  Using tool: xxx）
  if (line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/)) {
    const match = line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/);
    const toolName = match?.[1] || 'unknown';
    const status = match?.[2] || '';
    return (
      <Box>
        <Text color="blue">🔧 </Text>
        <Text color="blue" bold>{toolName}</Text>
        <Text color="gray" dimColor> {status}</Text>
      </Box>
    );
  }
  
  // Tool実行中の詳細（Reading directory, Reading file等）
  if (line.match(/^[│⋮●\s]*(Reading|Writing|Creating|Updating|Processing)\s+/) || 
      line.match(/^(Reading|Writing|Creating|Updating|Processing)\s+/)) {
    const cleanLine = line.replace(/^[│⋮●\s]*/, '').trim();
    return (
      <Box paddingLeft={2}>
        <Text color="cyan" dimColor>  → {cleanLine}</Text>
      </Box>
    );
  }
  
  // Tool成功メッセージ（✓ Successfully...）
  if (line.match(/✓\s+Successfully\s+/)) {
    const cleanLine = line.replace(/^[│⋮●\s]*/, '').trim();
    const message = cleanLine.replace(/✓\s*/, '');
    return (
      <Box paddingLeft={2}>
        <Text color="green">  ✓ </Text>
        <Text color="green">{message}</Text>
      </Box>
    );
  }
  
  // Tool完了メッセージ（● Completed in XXX）
  if (line.match(/●\s+Completed\s+in\s+[\d.]+s/)) {
    const match = line.match(/●\s+Completed\s+in\s+([\d.]+s)/);
    const duration = match?.[1] || '';
    return (
      <Box paddingLeft={2}>
        <Text color="green" dimColor>  ⏱ {duration}</Text>
      </Box>
    );
  }
  
  // Tool検証失敗（Tool validation failed）
  if (line.includes('Tool validation failed')) {
    return (
      <Box>
        <Text color="red">⚠ </Text>
        <Text color="red">Tool validation error</Text>
      </Box>
    );
  }
  
  // Tool検証失敗の詳細（Failed to validate tool parameters）
  if (line.match(/Failed to validate tool parameters:/)) {
    const message = line.replace(/^[│⋮●\s]*Failed to validate tool parameters:\s*/, '').trim();
    return (
      <Box paddingLeft={2}>
        <Text color="red" dimColor>  → {message}</Text>
      </Box>
    );
  }
  
  // Tool関連の境界線や継続マーカーを非表示
  if (line.match(/^[│⋮●\s]*$/) || line.match(/^\s*[│⋮●]+\s*$/)) {
    return null; // 表示しない
  }
  
  // Tool関連の冗長な出力をフィルタ
  if (line.match(/^\s*[│⋮●]+\s+/) && !line.match(/(Reading|Writing|Creating|Updating|Processing|Successfully|Completed|Failed)/)) {
    return null; // 表示しない
  }
  
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
        displayLines.map((line, index) => {
          const formattedLine = formatLine(line);
          // nullが返された場合は表示しない
          if (formattedLine === null) {
            return null;
          }
          return (
            <Box key={`${index}-${line.substring(0, 10)}`}>
              {formattedLine}
            </Box>
          );
        }).filter(Boolean) // nullを除外
      )}
    </Box>
  );
};
