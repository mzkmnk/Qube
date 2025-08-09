import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { ProcessedLine } from '../lib/stream-processor.js';

interface EnhancedOutputProps {
  /** 処理済みの行データ */
  lines: ProcessedLine[];
  /** 表示高さ */
  height?: number;
  /** スクロールオフセット */
  scrollOffset?: number;
  /** 処理中かどうか */
  isProcessing?: boolean;
  /** 処理中のメッセージ */
  processingMessage?: string;
}

/**
 * ストリーム処理済みの出力を表示するコンポーネント
 * 色付け、JSON整形、スピナー表示をサポート
 */
export const EnhancedOutput: React.FC<EnhancedOutputProps> = ({
  lines,
  height,
  scrollOffset = 0,
  isProcessing = false,
  processingMessage = 'Processing...'
}) => {
  // 表示する行を決定
  let displayLines = lines;
  
  if (height && height > 0) {
    // スクロールオフセットを適用
    const start = scrollOffset;
    const end = start + height;
    displayLines = lines.slice(start, end);
  }

  return (
    <Box flexDirection="column" flexGrow={height ? 0 : 1} borderStyle="single" paddingX={1}>
      {displayLines.map((line, index) => (
        <Text key={`${index}-${line.raw.substring(0, 10)}`}>
          {line.text}
        </Text>
      ))}
      
      {/* 処理中インジケーター */}
      {isProcessing && (
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> {processingMessage}</Text>
        </Box>
      )}
    </Box>
  );
};