import React from 'react';
import { Box, Text } from 'ink';

const cleanAnsi = (line: string): string => {
  return line
    .replace(/\[?\?25h/g, '') // カーソル表示制御
    .replace(/\[?\?25l/g, '') // カーソル非表示制御
    .replace(/\x1b\[[0-9;]*[mKH]/g, '') // エスケープシーケンス（色・クリア等）
    .replace(/\[\?[0-9;]*[mKH]/g, '') // 16進表記も
    .replace(/\[\?[0-9;]*[hlc]/g, '') // プライベートモード
    .trim();
};

const formatPermissionRequest = (line: string): React.ReactNode | null => {
  if (line.match(/.*\[y\/n\/t\]:?\s*$/) && line.match(/\b(Allow|trust|action|command|execute)\b/i)) {
    const message = line
      .replace(/\s*\[y\/n\/t\]:?\s*$/, '')
      .replace(/Use\s+'[^']*'\s+to\s+trust[^.]*\./i, '')
      .trim();
    return (
      <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="yellow">
        <Box><Text color="yellow" bold>🔐 Amazon Q - Permission Required</Text></Box>
        <Box marginTop={1}><Text color="white">{message || 'Allow this action?'}</Text></Box>
        <Box marginTop={1} flexDirection="row" gap={1}><Text color="green" bold>[y]</Text><Text color="gray">Yes - Allow once</Text></Box>
        <Box flexDirection="row" gap={1}><Text color="red" bold>[n]</Text><Text color="gray">No - Deny action</Text></Box>
        <Box flexDirection="row" gap={1}><Text color="cyan" bold>[t]</Text><Text color="gray">Trust - Always allow this tool</Text></Box>
        <Box marginTop={1}><Text color="yellow" dimColor>Enter your choice: </Text></Box>
      </Box>
    );
  }
  return null;
};

const formatCliToolOutput = (line: string): React.ReactNode | 'IGNORE' | null => {
  if (line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/) || line.match(/🔧\s+(\w+)/)) {
    const useToolMatch = line.match(/🛠️\s+Using tool:\s+(\w+)\s*(\([^)]*\))?/);
    const fsToolMatch = line.match(/🔧\s+(\w+)/);
    const toolName = useToolMatch?.[1] || fsToolMatch?.[1] || 'unknown';
    const status = useToolMatch?.[2] || '';
    return <Box paddingX={1}><Text color="white" backgroundColor="blue" bold>🔧 {toolName}{status}</Text></Box>;
  }
  if (line.match(/^[│⋮●\s]*(Reading|Writing|Creating|Updating|Processing)\s+/) || line.match(/^(Reading|Writing|Creating|Updating|Processing)\s+/)) {
    const cleanLine = line.replace(/^[│⋮●\s]*/, '').trim();
    return <Box paddingLeft={2}><Text color="cyan" dimColor>  → {cleanLine}</Text></Box>;
  }
  if (line.match(/✓\s+Successfully\s+/)) {
    const cleanLine = line.replace(/^[│⋮●\s]*/, '').trim();
    const message = cleanLine.replace(/✓\s*/, '');
    return <Box paddingLeft={2}><Text color="green">  ✓ </Text><Text color="green">{message}</Text></Box>;
  }
  if (line.match(/●\s+Completed\s+in\s+[\d.]+s/)) {
    const match = line.match(/●\s+Completed\s+in\s+([\d.]+s)/);
    const duration = match?.[1] || '';
    return <Box paddingLeft={2}><Text color="green" dimColor>  ⏱ {duration}</Text></Box>;
  }
  if (line.includes('Tool validation failed')) {
    return <Box><Text color="red">⚠ </Text><Text color="red">Tool validation error</Text></Box>;
  }
  if (line.match(/Failed to validate tool parameters:/)) {
    const message = line.replace(/^[│⋮●\s]*Failed to validate tool parameters:\s*/, '').trim();
    return <Box paddingLeft={2}><Text color="red" dimColor>  → {message}</Text></Box>;
  }
  // These lines should be completely ignored
  if (line.match(/^[│⋮●\s]*$/) || line.match(/^\s*[│⋮●]+\s*$/)) {
    return 'IGNORE';
  }
  if (line.match(/^\s*[│⋮●]+\s+/) && !line.match(/(Reading|Writing|Creating|Updating|Processing|Successfully|Completed|Failed)/)) {
    return 'IGNORE';
  }
  return null;
};

const detectDiffLine = (line: string): boolean => {
  return (
    /^\s*(\d+),\s*\d+:/.test(line) || // Unchanged
    /^\s*•\s*\d+\s*:/.test(line) ||   // Removed
    /^\s*\+\s*\d+:\s*/.test(line) ||   // Added
    /^\s*-\s*\d+\s*:/.test(line)    // Alt removed
    // Simple +/- lines are too ambiguous and conflict with markdown lists.
    // The component's stateful buffering of diffs should rely on the more
    // explicit, numbered formats.
  );
};

const formatMarkdown = (line: string): React.ReactNode | null => {
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
        return <Box marginY={level <= 2 ? 1 : 0} paddingX={backgroundColor ? 1 : 0}><Text color={backgroundColor ? 'black' : color} backgroundColor={backgroundColor} bold>{prefix} {text}</Text></Box>;
    }

    if (line.startsWith('```')) {
        const language = line.substring(3).trim();
        return <Box marginY={1} paddingX={1}><Text color="black" backgroundColor="yellowBright">{language ? `▼ ${language}` : '▼ Code'}</Text></Box>;
    }

    if (line.includes('`')) {
        const parts = line.split(/(`[^`]+`)/);
        return <Box>{parts.map((part, index) => part.startsWith('`') && part.endsWith('`') ? <Text key={index} color="cyan" backgroundColor="gray">{part.slice(1, -1)}</Text> : <Text key={index}>{part}</Text>)}</Box>;
    }

    if (line.match(/\*\*[^*]+\*\*|\__[^_]+\__/)) {
        const parts = line.split(/(\*\*[^*]+\*\*|__[^_]+__)/);
        return <Box>{parts.map((part, index) => (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__')) ? <Text key={index} bold>{part.slice(2, -2)}</Text> : <Text key={index}>{part}</Text>)}</Box>;
    }

    if (line.match(/\*[^*]+\*|_[^_]+_/)) {
        const parts = line.split(/(\*[^*]+\*|_[^_]+_)/);
        return <Box>{parts.map((part, index) => (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) || (part.startsWith('_') && part.endsWith('_') && !part.startsWith('__')) ? <Text key={index} italic>{part.slice(1, -1)}</Text> : <Text key={index}>{part}</Text>)}</Box>;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
        const indent = listMatch[1].length;
        const marker = listMatch[2];
        const text = listMatch[3];
        const symbol = /\d+\./.test(marker) ? '▸' : '•';
        return <Box paddingLeft={Math.floor(indent / 2)}><Text color="blue">{symbol} </Text><Text>{text}</Text></Box>;
    }

    const quoteMatch = line.match(/^(>+)\s*(.*)$/);
    if (quoteMatch) {
        const level = quoteMatch[1].length;
        const text = quoteMatch[2];
        return <Box paddingLeft={level} borderLeft borderColor="yellow"><Text color="yellow" dimColor>▐ </Text><Text color="gray" italic>{text}</Text></Box>;
    }

    if (line.match(/^(---+|\*\*\*+|___+)$/)) {
        return <Box marginY={1}><Text color="gray" dimColor>{'─'.repeat(Math.min(50, process.stdout.columns || 80))}</Text></Box>;
    }

    if (line.includes('[') && line.includes('](')) {
        const parts = line.split(/(\[[^\]]+\]\([^)]+\))/);
        return <Box>{parts.map((part, index) => {
            const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                return <Box key={index} flexDirection="row"><Text color="blue" underline>{linkMatch[1]}</Text><Text color="gray" dimColor> ({linkMatch[2]})</Text></Box>;
            }
            return <Text key={index}>{part}</Text>;
        })}</Box>;
    }

    return null;
}

const formatThemedMessages = (line: string): React.ReactNode | null => {
    if (line.match(/↳\s*Purpose:/)) {
        return <Box><Text color="black" backgroundColor="cyanBright">↳ Purpose: {line.replace(/↳\s*Purpose:\s*/, '').trim()}</Text></Box>;
    }
    if (line.startsWith('💬')) {
        return <Box><Text color="cyan">▶ </Text><Text bold color="white">{line.substring(2).trim()}</Text></Box>;
    }
    if (line.startsWith('🤖')) {
        return <Box><Text color="magenta">◆ </Text><Text color="white">{line.substring(2).trim()}</Text></Box>;
    }
    if (line.startsWith('❌')) {
        return <Box paddingX={1}><Text color="white" backgroundColor="redBright">✗ {line.substring(2).trim()}</Text></Box>;
    }
    if (line.startsWith('✅')) {
        return <Box><Text color="green">✓ </Text><Text color="green">{line.substring(1).trim()}</Text></Box>;
    }
    if (line.startsWith('✨')) {
        return <Box><Text color="yellow">◈ </Text><Text color="yellow">{line.substring(1).trim()}</Text></Box>;
    }
    if (line.startsWith('⚠️')) {
        return <Box paddingX={1}><Text color="black" backgroundColor="yellowBright">⚠ {line.substring(2).trim()}</Text></Box>;
    }
    if (line.startsWith('🚀')) {
        return <Box marginY={1}><Text bold color="magenta">{line}</Text></Box>;
    }
    if (line.match(/^[━─═]+$/)) {
        return <Text dimColor>{line}</Text>;
    }
    return null;
}

const formatCode = (line: string, isInCodeBlock: boolean): React.ReactNode | null => {
    if (isInCodeBlock) {
        return <Box paddingX={1}><Text color="green" backgroundColor="blackBright">{line}</Text></Box>;
    }
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
    if (codePatterns.some(pattern => pattern.test(line))) {
        return <Box paddingX={1}><Text color="cyan" backgroundColor="blackBright">{line}</Text></Box>;
    }
    return null;
}

export const formatLine = (line: string, isInCodeBlock = false): React.ReactNode | 'DIFF_LINE' => {
  const cleanedLine = cleanAnsi(line);
  if (!cleanedLine) {
    return null;
  }

  // Check for lines that should be completely ignored first.
  const cliResult = formatCliToolOutput(cleanedLine);
  if (cliResult === 'IGNORE') {
    return null;
  }
  if (cliResult) {
    return cliResult;
  }

  // Diff lines need to be detected before markdown lists.
  if (detectDiffLine(cleanedLine)) {
    return 'DIFF_LINE';
  }

  const formatters: ((l: string) => React.ReactNode | null)[] = [
    formatPermissionRequest,
    formatThemedMessages,
    formatMarkdown,
  ];

  for (const formatter of formatters) {
    const result = formatter(cleanedLine);
    if (result) {
      return result;
    }
  }

  const codeResult = formatCode(cleanedLine, isInCodeBlock);
  if (codeResult) {
      return codeResult;
  }

  if (cleanedLine.startsWith('  ')) {
    return <Text color="gray">{cleanedLine}</Text>;
  }

  return <Text>{cleanedLine}</Text>;
};
