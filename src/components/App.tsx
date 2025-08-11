import React, { useState, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { Header } from './Header.js';
import { Output } from './Output.js';
import { Input } from './Input.js';
import { StatusBar } from './StatusBar.js';
import { CommandHistory } from '../lib/history.js';
import { QSession } from '../lib/q-session.js';
import { spawnQ } from '../lib/spawn-q.js';

interface AppProps {
  version?: string;
}

export const App: React.FC<AppProps> = ({ version = '0.1.0' }) => {
  const { exit } = useApp();
  
  // 状態管理
  const [mode, setMode] = useState<'command' | 'session'>('session');
  const [status, setStatus] = useState<'ready' | 'running' | 'error'>('ready');
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentCommand, setCurrentCommand] = useState<string | undefined>();
  const [errorCount, setErrorCount] = useState(0);
  const [history] = useState(() => new CommandHistory());
  const [session] = useState(() => new QSession());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentProgressLine, setCurrentProgressLine] = useState<string | null>(null); // 現在のプログレス行
  
  // 起動時に自動的にQ chatセッションを開始
  useEffect(() => {
    if (!sessionStarted) {
      const startSession = async () => {
        try {
          setStatus('running');
          await session.start('chat');
          setSessionStarted(true);
          setStatus('ready');
          // 初期メッセージは表示しない（Qからのメッセージのみ表示）
          setOutputLines(prev => [...prev]);
        } catch (error) {
          setOutputLines(prev => [...prev, `❌ Failed to start Q session: ${error instanceof Error ? error.message : String(error)}`]);
          setStatus('error');
          setMode('command');
        }
      };
      startSession();
    }
  }, [session, sessionStarted]);

  // セッションからの出力を最小限の整形で処理（Thinkingの抑制 + CR進捗処理）
  useEffect(() => {
    const bufferRef = { current: '' };

    const handleData = (_type: string, data: string) => {
      // CRLF正規化（ANSIや色は保持）
      let merged = (bufferRef.current + data).replace(/\r\n/g, '\n');

      // CR（キャリッジリターン）を利用した進捗行の更新
      if (merged.includes('\r')) {
        const crParts = merged.split('\r');
        const lastPart = crParts[crParts.length - 1];
        const progressPatterns = [
          /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*\.{3}/, // スピナー + ...
          /Loading\.\.\./,
          /Processing\.\.\./,
          /Downloading|Uploading|Indexing/i
        ];
        if (progressPatterns.some(p => p.test(lastPart))) {
          setCurrentProgressLine(lastPart.trim());
        }
        // 最新内容のみを対象にして以降の処理を行う
        merged = lastPart;
      }

      const parts = merged.split('\n');
      const incomplete = parts.pop() || '';
      const linesToAdd: string[] = [];

      // 改行が来たタイミングで、進捗行が存在すれば1回だけ履歴に残す
      if (parts.length > 0 && currentProgressLine) {
        linesToAdd.push(currentProgressLine);
        setCurrentProgressLine(null);
      }

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Thinking... 系の行は抑制
        if (trimmed === 'Thinking...' || trimmed.includes('Thinking...')) continue;
        linesToAdd.push(line);
      }

      bufferRef.current = incomplete;
      if (linesToAdd.length > 0) {
        setOutputLines(prev => [...prev, ...linesToAdd]);
      }
    };

    const handleExit = (code: number) => {
      setStatus('ready');
      setMode('command');
      if (code !== 0) {
        setErrorCount(prev => prev + 1);
      }
      setOutputLines(prev => [...prev, '⚠️ Q session ended']);
    };
    
    const handleError = (error: Error) => {
      setOutputLines(prev => [...prev, `❌ Error: ${error.message}`]);
      setStatus('error');
      setErrorCount(prev => prev + 1);
    };
    
    session.on('data', handleData);
    session.on('exit', handleExit);
    session.on('error', handleError);
    
    return () => {
      session.removeListener('data', handleData);
      session.removeListener('exit', handleExit);
      session.removeListener('error', handleError);
    };
  }, [session]);
  
  // キーバインドの処理
  useInput((input, key) => {
    // Ctrl+D: 終了
    if (key.ctrl && input === 'd') {
      if (session.running) {
        session.stop();
      }
      exit();
      process.exit(0);
    }
    
    // Ctrl+C: 現在の処理を中断
    if (key.ctrl && input === 'c') {
      if (session.running) {
        session.stop();
        setStatus('ready');
        setMode('command');
      }
    }
    
    // Ctrl+L: クリア
    if (key.ctrl && input === 'l') {
      setOutputLines([]);
      setErrorCount(0);
    }
    
    // 上矢印: 履歴を遡る
    if (key.upArrow) {
      const prev = history.getPrevious();
      if (prev) {
        setInputValue(prev);
      }
    }
    
    // 下矢印: 履歴を進める
    if (key.downArrow) {
      const next = history.getNext();
      setInputValue(next);
    }
  });
  
  // コマンド実行
  const handleSubmit = async (command: string) => {
    if (!command.trim()) return;
    
    // 履歴に追加
    history.add(command);
    history.resetPosition();
    
    // 出力に追加（プロンプトにアイコンを追加）
    setOutputLines(prev => [...prev, `💬 ${command}`]);
    setInputValue('');
    setCurrentCommand(command);
    setStatus('running');
    
    try {
      // セッションモードのコマンドか判定
      if (command.startsWith('q chat') || command.startsWith('q translate')) {
        // セッションモードに切り替え
        setMode('session');
        const sessionType = command.split(' ')[1];
        await session.start(sessionType);
      } else if (mode === 'session' && session.running) {
        // セッションに入力を送信
        session.send(command);
      } else {
        // 通常のコマンド実行
        const result = await spawnQ(command.replace(/^q\s+/, '').split(' '));
        if (result.stdout) {
          setOutputLines(prev => [...prev, ...result.stdout.split('\n').filter(Boolean)]);
        }
        setStatus(result.exitCode === 0 ? 'ready' : 'error');
      }
    } catch (error) {
      setOutputLines(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
      setStatus('error');
      setErrorCount(prev => prev + 1);
    } finally {
      if (!session.running) {
        setCurrentCommand(undefined);
        setStatus('ready');
      }
    }
  };
  
  return (
    <Box flexDirection="column" height="100%">
      <Header 
        title="Qube" 
        version={version} 
        connected={sessionStarted && session.running}
      />
      <Output lines={[
        ...outputLines,
        ...(currentProgressLine ? [currentProgressLine] : [])
      ]} />
      <Input
        value={inputValue}
        placeholder="Enter Q command..."
        disabled={status === 'running' && mode === 'command'}
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
      <StatusBar
        mode={mode}
        status={status}
        errorCount={errorCount}
        currentCommand={currentCommand}
        showHelp={true}
      />
    </Box>
  );
};
