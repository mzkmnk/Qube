import React from 'react';
import { Box, Text } from 'ink';

interface OutputProps {
  lines: string[];
  height?: number;
  scrollOffset?: number;
}

// コードブロックやマークダウンの検出とスタイリング
const formatLine = (line: string, isInCodeBlock = false): React.ReactNode => {
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
  
  // GitHub Diff風: 改善された差分表示（コンパクト版）
  // Amazon Q CLIの複雑なパターンを統一された見やすい形式に変換
  
  // パターン1: 変更なしの行（oldNum, newNum: code）
  const unchangedMatch = line.match(/^\s*(\d+),\s*(\d+):\s*(.*)$/);
  if (unchangedMatch) {
    const lineNum = unchangedMatch[2].padStart(4, ' ');
    const code = unchangedMatch[3];
    
    return (
      <Box>
        <Text color="gray">{lineNum} │ </Text>
        <Text>{code}</Text>
      </Box>
    );
  }
  
  // パターン2: 削除行（• num : code）
  const removedMatch = line.match(/^\s*•\s*(\d+)\s*:\s*(.*)$/);
  if (removedMatch) {
    const lineNum = removedMatch[1].padStart(2, ' ');
    const code = removedMatch[2];
    
    return (
      <Box>
        <Text color="red" bold> -{lineNum} │ </Text>
        <Text color="red" dimColor>{code}</Text>
      </Box>
    );
  }
  
  // パターン3: 追加行（+ num: code）
  const addedMatch = line.match(/^\s*\+\s*(\d+):\s*(.*)$/);
  if (addedMatch) {
    const lineNum = addedMatch[1].padStart(2, ' ');
    const code = addedMatch[2];
    
    return (
      <Box>
        <Text color="green" bold> +{lineNum} │ </Text>
        <Text color="green">{code}</Text>
      </Box>
    );
  }
  
  // パターン4: Amazon Q CLIの別形式（- lineNum : code）形式の削除行
  const altRemoveMatch = line.match(/^\s*-\s*(\d+)\s*:\s*(.*)$/);
  if (altRemoveMatch) {
    const lineNum = altRemoveMatch[1].padStart(2, ' ');
    const code = altRemoveMatch[2];
    
    return (
      <Box>
        <Text color="red" bold> -{lineNum} │ </Text>
        <Text color="red" dimColor>{code}</Text>
      </Box>
    );
  }
  
  // パターン5: 単純な追加行（行番号なし、+ で始まる）
  if (line.trim().startsWith('+') && !line.match(/^\s*\+\s*\d+:/)) {
    const content = line.replace(/^\s*\+\s*/, '');
    return (
      <Box>
        <Text color="green" bold>  +   │ </Text>
        <Text color="green">{content}</Text>
      </Box>
    );
  }
  
  // パターン6: 単純な削除行（行番号なし、- で始まる）
  if (line.trim().startsWith('-') && !line.match(/^\s*-\s*\d+:/) && !line.match(/^---+|^--$/)) {
    const content = line.replace(/^\s*-\s*/, '');
    return (
      <Box>
        <Text color="red" bold>  -   │ </Text>
        <Text color="red" dimColor>{content}</Text>
      </Box>
    );
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

  // コードブロックの状態を追跡
  let isInCodeBlock = false;
  const processedLines = displayLines.map((line, index) => {
    // コードブロックの開始・終了を検出
    if (line.trim().startsWith('```')) {
      isInCodeBlock = !isInCodeBlock;
      return { line, index, isCodeBlockMarker: true, isInCodeBlock: false };
    }
    
    return { line, index, isCodeBlockMarker: false, isInCodeBlock };
  });

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
      {processedLines.length === 0 ? (
        <Text color="gray" dimColor>Waiting for output...</Text>
      ) : (
        processedLines.map((lineInfo, index) => {
          const formattedLine = formatLine(lineInfo.line, lineInfo.isInCodeBlock);
          // nullが返された場合は表示しない
          if (formattedLine === null) {
            return null;
          }
          return (
            <Box key={`${index}-${lineInfo.line.substring(0, 10)}`}>
              {formattedLine}
            </Box>
          );
        }).filter(Boolean) // nullを除外
      )}
    </Box>
  );
};
