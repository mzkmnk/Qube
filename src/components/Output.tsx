import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

// 差分ペアを表現する型
interface DiffPair {
  lineNum: number;
  oldContent?: string;
  newContent?: string;
  isUnchanged?: boolean;
}

// 文字列を指定幅で切り詰める
const truncateString = (str: string, maxWidth: number): string => {
  if (str.length <= maxWidth) {
    return str.padEnd(maxWidth, ' ');
  }
  return str.substring(0, maxWidth - 2) + '..';
};

// 差分行のバッファから左右並列表示用のペアを生成
const createDiffPairs = (diffLines: string[]): DiffPair[] => {
  const pairs: Map<number, DiffPair> = new Map();
  
  diffLines.forEach(line => {
    // 変更なし行（oldNum, newNum: code）
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
    
    // 削除行（• num : code）
    const removedMatch = line.match(/^\s*•\s*(\d+)\s*:\s*(.*)$/);
    if (removedMatch) {
      const lineNum = parseInt(removedMatch[1]);
      const existing = pairs.get(lineNum) || { lineNum };
      existing.oldContent = removedMatch[2];
      pairs.set(lineNum, existing);
      return;
    }
    
    // 追加行（+ num: code）
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

// 左右並列diff表示をレンダリング
const renderSideBySideDiff = (diffLines: string[]): React.ReactNode => {
  const pairs = createDiffPairs(diffLines);
  if (pairs.length === 0) return null;
  
  // ターミナル幅を取得して列幅を計算
  const terminalWidth = process.stdout.columns || 120;
  const columnWidth = Math.floor((terminalWidth - 10) / 2); // 左右の列幅
  
  return (
    <Box flexDirection="column" marginY={1}>
      {/* 上部の境界線 */}
      <Box>
        <Text color="gray">{'━'.repeat(Math.min(terminalWidth - 2, 80))}</Text>
      </Box>
      
      {/* 差分行 */}
      {pairs.map((pair, index) => {
        const lineNumStr = pair.lineNum.toString().padStart(2, ' ');
        const oldContent = pair.oldContent || '';
        const newContent = pair.newContent || '';
        
        if (pair.isUnchanged) {
          // 変更なし行
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
          // 変更あり行
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
      
      {/* フッター */}
      <Box>
        <Text color="gray">{'━'.repeat(Math.min(terminalWidth - 2, 80))}</Text>
      </Box>
    </Box>
  );
};

// コードブロックやマークダウンの検出とスタイリング
const formatLine = (line: string, isInCodeBlock = false, isDiffLine = false): React.ReactNode | 'DIFF_LINE' => {
  // 汎用的なANSIエスケープシーケンスの除去（最初に処理）
  let cleanedLine = line;
  
  // 一般的なANSIエスケープシーケンスを除去
  cleanedLine = cleanedLine
    .replace(/\[?\?25h/g, '') // カーソル表示制御
    .replace(/\[?\?25l/g, '') // カーソル非表示制御
    .replace(/\x1b\[[0-9;]*[mKH]/g, '') // エスケープシーケンス（色・クリア等）
    .replace(/\x1b\[[0-9;]*[mKH]/g, '') // エスケープシーケンス（16進表記）
    .replace(/\[\?[0-9;]*[hlc]/g, '') // プライベートモードエスケープシーケンス
    .trim();
  
  // 空行になった場合は処理しない
  if (!cleanedLine) {
    return null;
  }
  
  // 以降の処理では cleanedLine を使用
  line = cleanedLine;
  
  // Amazon Q CLI ユーザー確認メッセージの処理
  
  // ANSIエスケープシーケンスを含む確認メッセージ
  if (line.match(/.*\[y\/n\/t\]:?\s*$/) && 
      line.match(/\b(Allow|trust|action|command|execute)\b/i)) {
    // メッセージを抽出
    const message = line
      .replace(/\s*\[y\/n\/t\]:?\s*$/, '')
      .replace(/Use\s+'[^']*'\s+to\s+trust[^.]*\./i, '')
      .trim();

    return (
      <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="yellow">
        <Box>
          <Text color="yellow" bold>🔐 Amazon Q - Permission Required</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="white">{message || 'Allow this action?'}</Text>
        </Box>
        <Box marginTop={1} flexDirection="row" gap={1}>
          <Text color="green" bold>[y]</Text>
          <Text color="gray">Yes - Allow once</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color="red" bold>[n]</Text>
          <Text color="gray">No - Deny action</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color="cyan" bold>[t]</Text>
          <Text color="gray">Trust - Always allow this tool</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow" dimColor>Enter your choice: </Text>
        </Box>
      </Box>
    );
  }
  
  // Amazon Q CLI Tools関連の出力を処理
  
  // Tool使用開始（🛠️  Using tool: xxx または 🔧 fs_write）
  if (line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/) || line.match(/🔧\s+(\w+)/)) {
    const useToolMatch = line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/);
    const fsToolMatch = line.match(/🔧\s+(\w+)/);
    
    const toolName = useToolMatch?.[1] || fsToolMatch?.[1] || 'unknown';
    const status = useToolMatch?.[2] || '';
    
    return (
      <Box paddingX={1}>
        <Text color="white" backgroundColor="blue" bold>
          🔧 {toolName}{status}
        </Text>
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
  
  // GitHub Diff風: 差分表示の検出
  // Amazon Q CLIの複雑なパターンを検出して、左右並列表示のフラグを返す
  
  // パターン1: 変更なしの行（oldNum, newNum: code）
  const unchangedMatch = line.match(/^\s*(\d+),\s*(\d+):\s*(.*)$/);
  if (unchangedMatch) {
    return 'DIFF_LINE';
  }
  
  // パターン2: 削除行（• num : code）
  const removedMatch = line.match(/^\s*•\s*(\d+)\s*:\s*(.*)$/);
  if (removedMatch) {
    return 'DIFF_LINE';
  }
  
  // パターン3: 追加行（+ num: code）
  const addedMatch = line.match(/^\s*\+\s*(\d+):\s*(.*)$/);
  if (addedMatch) {
    return 'DIFF_LINE';
  }
  
  // パターン4: Amazon Q CLIの別形式（- lineNum : code）形式の削除行
  const altRemoveMatch = line.match(/^\s*-\s*(\d+)\s*:\s*(.*)$/);
  if (altRemoveMatch) {
    return 'DIFF_LINE';
  }
  
  // パターン5: 単純な追加行（行番号なし、+ で始まる）
  if (line.trim().startsWith('+') && !line.match(/^\s*\+\s*\d+:/)) {
    return 'DIFF_LINE';
  }
  
  // パターン6: 単純な削除行（行番号なし、- で始まる）
  if (line.trim().startsWith('-') && !line.match(/^\s*-\s*\d+:/) && !line.match(/^---+|^--$/)) {
    return 'DIFF_LINE';
  }
  
  // ファイル目的表示（↳ Purpose:）
  if (line.match(/↳\s*Purpose:/)) {
    const purposeText = line.replace(/↳\s*Purpose:\s*/, '').trim();
    return (
      <Box>
        <Text color="black" backgroundColor="cyanBright">
          ↳ Purpose: {purposeText}
        </Text>
      </Box>
    );
  }
  
  // Markdown処理
  
  // ヘッダーの処理
  const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const text = headerMatch[2];
    const colors = ['magenta', 'cyan', 'blue', 'green', 'yellow', 'white'];
    const bgColors = ['magentaBright', 'cyanBright', 'blueBright', 'greenBright', 'yellowBright', 'blackBright'];
    const color = colors[level - 1] || 'white';
    const backgroundColor = level <= 2 ? bgColors[level - 1] : undefined;
    const prefixes = ['◆', '◇', '◈', '◉', '○', '●'];
    const prefix = prefixes[level - 1] || '●';
    
    return (
      <Box marginY={level <= 2 ? 1 : 0} paddingX={backgroundColor ? 1 : 0}>
        <Text 
          color={backgroundColor ? 'black' : color} 
          backgroundColor={backgroundColor}
          bold
        >
          {prefix} {text}
        </Text>
      </Box>
    );
  }
  
  // コードブロックの開始・終了
  if (line.startsWith('```')) {
    const language = line.substring(3).trim();
    return (
      <Box marginY={1} paddingX={1}>
        <Text color="black" backgroundColor="yellowBright">
          {language ? `▼ ${language}` : '▼ Code'}
        </Text>
      </Box>
    );
  }
  
  // インラインコード、太字、イタリックの処理
  let processedLine = line;
  
  // インラインコード: `code`
  if (processedLine.includes('`')) {
    const parts = processedLine.split(/(`[^`]+`)/);
    return (
      <Box>
        {parts.map((part, index) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            const code = part.slice(1, -1);
            return (
              <Text key={index} color="cyan" backgroundColor="gray">
                {code}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Box>
    );
  }
  
  // 太字: **text** または __text__
  if (processedLine.match(/\*\*[^*]+\*\*|\__[^_]+\__/)) {
    const parts = processedLine.split(/(\*\*[^*]+\*\*|__[^_]+__)/);
    return (
      <Box>
        {parts.map((part, index) => {
          if ((part.startsWith('**') && part.endsWith('**')) || 
              (part.startsWith('__') && part.endsWith('__'))) {
            const text = part.slice(2, -2);
            return <Text key={index} bold>{text}</Text>;
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Box>
    );
  }
  
  // イタリック: *text* または _text_
  if (processedLine.match(/\*[^*]+\*|_[^_]+_/)) {
    const parts = processedLine.split(/(\*[^*]+\*|_[^_]+_)/);
    return (
      <Box>
        {parts.map((part, index) => {
          if ((part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) || 
              (part.startsWith('_') && part.endsWith('_') && !part.startsWith('__'))) {
            const text = part.slice(1, -1);
            return <Text key={index} italic>{text}</Text>;
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Box>
    );
  }
  
  // リスト項目の処理
  const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (listMatch) {
    const indent = listMatch[1].length;
    const marker = listMatch[2];
    const text = listMatch[3];
    const isNumbered = /\d+\./.test(marker);
    const symbol = isNumbered ? '▸' : '•';
    
    return (
      <Box paddingLeft={Math.floor(indent / 2)}>
        <Text color="blue">{symbol} </Text>
        <Text>{text}</Text>
      </Box>
    );
  }
  
  // 引用の処理
  const quoteMatch = line.match(/^(>+)\s*(.*)$/);
  if (quoteMatch) {
    const level = quoteMatch[1].length;
    const text = quoteMatch[2];
    
    return (
      <Box paddingLeft={level} borderLeft borderColor="yellow">
        <Text color="yellow" dimColor>▐ </Text>
        <Text color="gray" italic>{text}</Text>
      </Box>
    );
  }
  
  // 水平線の処理
  if (line.match(/^(---+|\*\*\*+|___+)$/)) {
    return (
      <Box marginY={1}>
        <Text color="gray" dimColor>
          {'─'.repeat(Math.min(50, process.stdout.columns || 80))}
        </Text>
      </Box>
    );
  }
  
  // リンクの処理
  if (line.includes('[') && line.includes('](')) {
    const parts = line.split(/(\[[^\]]+\]\([^)]+\))/);
    return (
      <Box>
        {parts.map((part, index) => {
          const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            const text = linkMatch[1];
            const url = linkMatch[2];
            return (
              <Box key={index} flexDirection="row">
                <Text color="blue" underline>{text}</Text>
                <Text color="gray" dimColor> ({url})</Text>
              </Box>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Box>
    );
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
      <Box paddingX={1}>
        <Text color="white" backgroundColor="redBright">
          ✗ {line.substring(2).trim()}
        </Text>
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
      <Box paddingX={1}>
        <Text color="black" backgroundColor="yellowBright">
          ⚠ {line.substring(2).trim()}
        </Text>
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
  
  // コードブロック内の行処理
  if (isInCodeBlock) {
    return (
      <Box paddingX={1}>
        <Text color="green" backgroundColor="blackBright">
          {line}
        </Text>
      </Box>
    );
  }
  
  // プログラムコードっぽい行の自動検出
  const codePatterns = [
    /^(import|export|from|const|let|var|function|class|interface|type)\s+/,
    /^(if|else|for|while|switch|case|try|catch|finally)\s*\(/,
    /^\s*(return|throw|break|continue)\s+/,
    /^(public|private|protected|static|async|await)\s+/,
    /[=<>!]=|[&|]{2}|[+\-*/%]=|\+\+|--|=>/,
    /[\{\}\[\]();].*[\{\}\[\]();]/,
    /^[\s]*\/\/|^[\s]*\/\*|^[\s]*\*/,
    /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:=]\s*/,
    /^[\s]*<[^>]+>/,
    /console\.(log|error|warn|info)/,
    /require\(|import\(/
  ];
  
  const looksLikeCode = codePatterns.some(pattern => pattern.test(line));
  
  if (looksLikeCode) {
    return (
      <Box paddingX={1}>
        <Text color="cyan" backgroundColor="blackBright">
          {line}
        </Text>
      </Box>
    );
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
          <Box key={`diff-${index}`}>
            {renderSideBySideDiff(diffBuffer)}
          </Box>
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
    
    const formattedLine = formatLine(line, isInCodeBlock, false);
    
    // 差分行の場合はバッファに追加
    if (formattedLine === 'DIFF_LINE') {
      diffBuffer.push(line);
      return;
    }
    
    // 差分行以外が来たら、バッファをフラッシュ
    if (diffBuffer.length > 0) {
      processedElements.push(
        <Box key={`diff-${index}`}>
          {renderSideBySideDiff(diffBuffer)}
        </Box>
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
      <Box key="diff-final">
        {renderSideBySideDiff(diffBuffer)}
      </Box>
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
