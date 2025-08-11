import React, { useState, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { Header } from './Header.js';
import { Output } from './Output.js';
import { Input } from './Input.js';
import { StatusBar } from './StatusBar.js';
import { CommandHistory } from '../lib/history.js';
import { QSession } from '../lib/q-session.js';
import { spawnQ } from '../lib/spawn-q.js';
import { StreamProcessor } from '../lib/stream-processor.js';
import { KeyboardHandler } from '../lib/keyboard-handler.js';

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
  const [currentProgressLine, setCurrentProgressLine] = useState<string | null>(null);
  
  // ストリーム処理の専用プロセッサー
  const [streamProcessor] = useState(() => new StreamProcessor({
    onLinesReady: (lines) => setOutputLines(prev => [...prev, ...lines]),
    onProgressUpdate: (line) => setCurrentProgressLine(line)
  }));
  
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

  // セッションからの出力処理
  useEffect(() => {
    const handleData = (type: string, data: string) => {
      streamProcessor.processData(type, data);
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
  }, [session, streamProcessor]);
  
  // キーボードハンドラーの初期化
  const [keyboardHandler] = useState(() => new KeyboardHandler({
    onExit: () => {
      if (session.running) {
        session.stop();
      }
      exit();
      process.exit(0);
    },
    onInterrupt: () => {
      if (session.running) {
        session.stop();
        setStatus('ready');
        setMode('command');
      }
    },
    onClear: () => {
      setOutputLines([]);
      setErrorCount(0);
      streamProcessor.clear();
    },
    onHistoryUp: () => {
      const prev = history.getPrevious();
      if (prev) {
        setInputValue(prev);
      }
    },
    onHistoryDown: () => {
      const next = history.getNext();
      setInputValue(next);
    }
  }));
  
  // キーバインドの処理
  useInput((input, key) => {
    keyboardHandler.handleInput(input, key);
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
