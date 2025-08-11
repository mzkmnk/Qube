import React from 'react';
import { Box, Text } from 'ink';

interface DiffViewerProps {
  diffLines: string[];
}

interface DiffPair {
  lineNum: number;
  oldContent?: string;
  newContent?: string;
  isUnchanged?: boolean;
}

const truncateString = (str: string, maxWidth: number): string => {
  if (str.length <= maxWidth) {
    return str.padEnd(maxWidth, ' ');
  }
  return str.substring(0, maxWidth - 2) + '..';
};

const createDiffPairs = (diffLines: string[]): DiffPair[] => {
  const pairs: Map<number, DiffPair> = new Map();

  diffLines.forEach(line => {
    const unchangedMatch = line.match(/^\s*(\d+),\s*\d+:\s*(.*)$/);
    if (unchangedMatch) {
      const lineNum = parseInt(unchangedMatch[1]);
      pairs.set(lineNum, {
        lineNum,
        oldContent: unchangedMatch[2],
        newContent: unchangedMatch[2],
        isUnchanged: true
      });
      return;
    }

    const removedMatch = line.match(/^\s*•\s*(\d+)\s*:\s*(.*)$/);
    if (removedMatch) {
      const lineNum = parseInt(removedMatch[1]);
      const existing = pairs.get(lineNum) || { lineNum };
      existing.oldContent = removedMatch[2];
      pairs.set(lineNum, existing);
      return;
    }

    const addedMatch = line.match(/^\s*\+\s*(\d+):\s*(.*)$/);
    if (addedMatch) {
      const lineNum = parseInt(addedMatch[1]);
      const existing = pairs.get(lineNum) || { lineNum };
      existing.newContent = addedMatch[2];
      pairs.set(lineNum, existing);
      return;
    }
  });

  return Array.from(pairs.values()).sort((a, b) => a.lineNum - b.lineNum);
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffLines }) => {
  const pairs = createDiffPairs(diffLines);
  if (pairs.length === 0) return null;

  const terminalWidth = process.stdout.columns || 120;
  const columnWidth = Math.floor((terminalWidth - 10) / 2);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color="gray">{'━'.repeat(Math.min(terminalWidth - 2, 80))}</Text>
      </Box>

      {pairs.map((pair, index) => {
        const lineNumStr = pair.lineNum.toString().padStart(2, ' ');
        const oldContent = pair.oldContent || '';
        const newContent = pair.newContent || '';

        if (pair.isUnchanged) {
          return (
            <Box key={index}>
              <Box width={columnWidth}>
                <Text color="gray">{lineNumStr}│ </Text>
                <Text color="gray" dimColor>{truncateString(oldContent, columnWidth - 4)}</Text>
              </Box>
              <Text color="gray"> │ </Text>
              <Box width={columnWidth}>
                <Text color="gray">{lineNumStr}│ </Text>
                <Text color="gray" dimColor>{truncateString(newContent, columnWidth - 4)}</Text>
              </Box>
            </Box>
          );
        } else {
          return (
            <Box key={index}>
              <Box width={columnWidth}>
                {oldContent ? (
                  <>
                    <Text color="red" bold>{lineNumStr}│ </Text>
                    <Text color="red">{truncateString(oldContent, columnWidth - 4)}</Text>
                  </>
                ) : (
                  <Text>{' '.repeat(columnWidth)}</Text>
                )}
              </Box>
              <Text color="gray"> │ </Text>
              <Box width={columnWidth}>
                {newContent ? (
                  <>
                    <Text color="green" bold>{lineNumStr}│ </Text>
                    <Text color="green">{truncateString(newContent, columnWidth - 4)}</Text>
                  </>
                ) : (
                  <Text>{' '.repeat(columnWidth)}</Text>
                )}
              </Box>
            </Box>
          );
        }
      })}

      <Box>
        <Text color="gray">{'━'.repeat(Math.min(terminalWidth - 2, 80))}</Text>
      </Box>
    </Box>
  );
};
