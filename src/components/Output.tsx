import React from 'react';
import { Box, Text } from 'ink';
import { formatLine } from './formatters/LineFormatter.js';
import { DiffViewer } from './diff/DiffViewer.js';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

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

  // コードブロックの状態と差分バッファを追跡
  let isInCodeBlock = false;
  let diffBuffer: string[] = [];
  const processedElements: React.ReactNode[] = [];
  
  displayLines.forEach((line, index) => {
    // コードブロックの開始・終了を検出
    if (line.trim().startsWith('```')) {
      isInCodeBlock = !isInCodeBlock;
      
      // 差分バッファがある場合は左右並列表示を生成
      if (diffBuffer.length > 0) {
        processedElements.push(
          <DiffViewer key={`diff-${index}`} diffLines={diffBuffer} />
        );
        diffBuffer = [];
      }
      
      const language = line.substring(3).trim();
      processedElements.push(
        <Box key={`code-${index}`} marginY={1} paddingX={1}>
          <Text color="black" backgroundColor="yellowBright">
            {language ? `▼ ${language}` : '▼ Code'}
          </Text>
        </Box>
      );
      return;
    }
    
    const formattedLine = formatLine(line, isInCodeBlock);
    
    // 差分行の場合はバッファに追加
    if (formattedLine === 'DIFF_LINE') {
      diffBuffer.push(line);
      return;
    }
    
    // 差分行以外が来たら、バッファをフラッシュ
    if (diffBuffer.length > 0) {
      processedElements.push(
        <DiffViewer key={`diff-${index}`} diffLines={diffBuffer} />
      );
      diffBuffer = [];
    }
    
    // nullが返された場合は表示しない
    if (formattedLine !== null) {
      processedElements.push(
        <Box key={`${index}-${line.substring(0, 10)}`}>
          {formattedLine}
        </Box>
      );
    }
  });
  
  // 最後に残った差分バッファを処理
  if (diffBuffer.length > 0) {
    processedElements.push(
      <DiffViewer key="diff-final" diffLines={diffBuffer} />
    );
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
      {processedElements.length === 0 ? (
        <Text color="gray" dimColor>Waiting for output...</Text>
      ) : (
        processedElements
      )}
    </Box>
  );
};
