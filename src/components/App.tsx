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
  const [streamBuffer, setStreamBuffer] = useState(''); // ストリーミングデータのバッファ
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

  // セッションからの出力を処理
  useEffect(() => {
    // バッファを保持するためのrefを使用
    const bufferRef = { current: '' };
    
    const handleData = (type: string, data: string) => {
      // ANSIエスケープシーケンスを完全に削除
      let cleanData = data;
      
      // すべてのANSIエスケープコードを段階的に削除
      cleanData = cleanData
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')    // 標準的なエスケープシーケンス
        .replace(/\x1b\].*?\x07/g, '')             // OSCシーケンス
        .replace(/\x1b[PX^_].*?\x1b\\/g, '')       // DCS/PM/APC/SOS シーケンス
        .replace(/\x1b[78]/g, '')                  // 保存/復元カーソル
        .replace(/\x1b[=>]/g, '')                  // アプリケーションキーパッドモード
        .replace(/\x1b\([0-2]/g, '')               // 文字セット指定
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // 制御文字（改行・キャリッジリターン以外）
        .replace(/\x7f/g, '');                     // DEL文字
      
      // ANSIカラーコードの残骸を削除（38;5;12mのような形式）
      cleanData = cleanData
        .replace(/\x1b?\[?38;5;\d+m/g, '')        // 256色前景色
        .replace(/\x1b?\[?48;5;\d+m/g, '')        // 256色背景色
        .replace(/\x1b?\[?\d+;\d+m/g, '')         // その他の色コード（エスケープが欠けている場合も対応）
        .replace(/^[\x1b\[]*\d+;\d+m/gm, '');     // 行頭のエスケープコード残骸のみ削除
      
      // バッファに追加
      let buffer = bufferRef.current + cleanData;
      
      // 処理する行のリスト
      const linesToAdd: string[] = [];
      let progressLine: string | null = null;
      
      // キャリッジリターン処理（プログレス表示用）
      if (buffer.includes('\r')) {
        const parts = buffer.split('\r');
        const lastPart = parts[parts.length - 1];
        
        // プログレス表示のパターン
        const progressPatterns = [
          /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,  // スピナー文字
          /Thinking\.\.\./,               // Thinking...
          /Loading\.\.\./,                // Loading...
          /Processing\.\.\./              // Processing...
        ];
        
        // プログレス表示かチェック
        const isProgress = progressPatterns.some(pattern => pattern.test(lastPart));
        
        if (isProgress) {
          // プログレス表示として処理
          progressLine = lastPart.replace(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏0-9]+/, match => {
            return match.replace(/[0-9]+/, '');
          }).trim();
          
          if (progressLine) {
            setCurrentProgressLine(progressLine);
          }
          
          bufferRef.current = '';
          return;
        } else {
          // 最後の部分だけを処理対象に
          buffer = lastPart;
        }
      }
      
      // 改行があるかチェック
      if (buffer.includes('\n')) {
        // 改行で分割
        const lines = buffer.split('\n');
        
        // 最後の行が不完全な可能性があるため、改行で終わっていない場合は保持
        let incompleteBuffer = '';
        if (!cleanData.endsWith('\n')) {
          incompleteBuffer = lines.pop() || '';
        }
        
        // 各行を処理
        for (const line of lines) {
          let trimmedLine = line.trim();
          
          // 残っている可能性のあるエスケープコードを削除
          trimmedLine = trimmedLine
            .replace(/^\[?\d+;\d+m/g, '')
            .replace(/38;5;\d+m/g, '')
            .replace(/48;5;\d+m/g, '')
            .replace(/\d+;\d+m/g, '')
            .replace(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*/, '')
            .replace(/^;+\s*/, '')
            .trim();
          
          // 空行、プログレス行、Thinking行をスキップ
          if (!trimmedLine) continue;
          if (trimmedLine.match(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/)) continue;
          if (trimmedLine === 'Thinking...' || trimmedLine.includes('Thinking...')) continue;
          
          linesToAdd.push(trimmedLine);
        }
        
        // バッファを更新
        bufferRef.current = incompleteBuffer;
      } else {
        // 改行がない場合、すべてをバッファに保持
        // ただし、文の終わりを検出したら出力する
        const sentenceEndPatterns = [
          /[.!?]\s*$/,     // 文末記号
          /:\s*$/,         // コロン
          /commands$/,     // 特定のキーワード（「/help all commands」など）
          /initialized\.?$/,  // 初期化メッセージ
          /Q!$/,           // Welcome to Amazon Q!
        ];
        
        // バッファが大きくなりすぎた場合、または文末パターンに一致する場合
        if (buffer.length > 80 || sentenceEndPatterns.some(pattern => pattern.test(buffer.trim()))) {
          const trimmedBuffer = buffer.trim()
            .replace(/^\[?\d+;\d+m/g, '')
            .replace(/38;5;\d+m/g, '')
            .replace(/48;5;\d+m/g, '')
            .replace(/\d+;\d+m/g, '')
            .replace(/^;+\s*/, '')
            .trim();
          
          if (trimmedBuffer && 
              !trimmedBuffer.match(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/) && 
              trimmedBuffer !== 'Thinking...' && 
              !trimmedBuffer.includes('Thinking...')) {
            linesToAdd.push(trimmedBuffer);
            bufferRef.current = '';
          } else {
            bufferRef.current = buffer;
          }
        } else {
          bufferRef.current = buffer;
        }
      }
      
      // 新しい行がある場合のみ出力を更新
      if (linesToAdd.length > 0) {
        setOutputLines(prev => [...prev, ...linesToAdd]);
        setCurrentProgressLine(null);
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
          setOutputLines(prev => [...prev, ...result.stdout.split('\n').filter(line => line)]);
        }
        
        if (result.stderr) {
          setOutputLines(prev => [...prev, ...result.stderr.split('\n').filter(line => line)]);
          setErrorCount(prev => prev + 1);
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
        prompt=">"
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
