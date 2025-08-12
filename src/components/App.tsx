import React, { useState, useEffect } from "react";
import { Box, useInput, useApp } from "ink";
import { Header } from "./Header";
import { Output } from "./Output";
import { Input } from "./Input";
import { StatusBar } from "./StatusBar";
import { QubeTitle } from "./QubeTitle";
import { CommandHistory } from "../lib/history";
import { QSession } from "../lib/q-session";
import { StreamProcessor } from "../lib/stream-processor";
import { KeyboardHandler } from "../lib/keyboard-handler";
import { CommandExecutor } from "../lib/command-executor";
import { clearTerminal } from "../lib/terminal";

interface AppProps {
  version?: string;
}

export const App: React.FC<AppProps> = ({ version = "0.1.0" }) => {
  const { exit } = useApp();

  // 状態管理
  const [mode, setMode] = useState<"command" | "session">("session");
  const [status, setStatus] = useState<"ready" | "running" | "error">("ready");
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentCommand, setCurrentCommand] = useState<string | undefined>();
  const [errorCount, setErrorCount] = useState(0);
  const [history] = useState(() => new CommandHistory());
  const [session] = useState(() => new QSession());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [currentProgressLine, setCurrentProgressLine] = useState<string | null>(
    null,
  );

  // ストリーム処理の専用プロセッサー
  const [streamProcessor] = useState(
    () =>
      new StreamProcessor({
        onLinesReady: (lines) => setOutputLines((prev) => [...prev, ...lines]),
        onProgressUpdate: (line) => setCurrentProgressLine(line),
      }),
  );

  // 起動時に自動的にQ chatセッションを開始
  useEffect(() => {
    if (!sessionStarted) {
      const startSession = async () => {
        try {
          setStatus("running");
          await session.start("chat");
          setSessionStarted(true);
          // 初期化完了は initialized イベントでハンドル
        } catch (error) {
          setOutputLines((prev) => [
            ...prev,
            `❌ Failed to start Q session: ${error instanceof Error ? error.message : String(error)}`,
          ]);
          setStatus("error");
          setMode("command");
        }
      };
      void startSession();
    }
  }, [session, sessionStarted]);

  // セッションからの出力処理
  useEffect(() => {
    const handleData = (type: string, data: string) => {
      streamProcessor.processData(type, data);
    };

    const handleExit = (code: number) => {
      setStatus("ready");
      setMode("command");
      if (code !== 0) {
        setErrorCount((prev) => prev + 1);
      }
      setOutputLines((prev) => [...prev, "⚠️ Q session ended"]);
    };

    const handleError = (error: Error) => {
      setOutputLines((prev) => [...prev, `❌ Error: ${error.message}`]);
      setStatus("error");
      setErrorCount((prev) => prev + 1);
    };

    const handleInitialized = () => {
      setSessionInitialized(true);
      setStatus("ready");
      // 初期化完了時に画面をクリア
      clearTerminal({ scrollback: true });
      streamProcessor.clear();
      setOutputLines([]);
    };

    session.on("data", handleData);
    session.on("exit", handleExit);
    session.on("error", handleError);
    session.on("initialized", handleInitialized);

    return () => {
      session.removeListener("data", handleData);
      session.removeListener("exit", handleExit);
      session.removeListener("error", handleError);
      session.removeListener("initialized", handleInitialized);
    };
  }, [session, streamProcessor]);

  // コマンド実行エンジンの初期化
  const [commandExecutor] = useState(
    () =>
      new CommandExecutor(session, {
        onModeChange: setMode,
        onStatusChange: (nextStatus) => {
          setStatus(nextStatus);
          if (nextStatus === "ready" && !session.running) {
            setCurrentCommand(undefined);
          }
        },
        onOutput: (lines) => {
          if (typeof lines === "string") {
            setOutputLines((prev) => [...prev, lines]);
          } else {
            setOutputLines((prev) => [...prev, ...lines]);
          }
        },
        onError: (message) => {
          setOutputLines((prev) => [...prev, `❌ Error: ${message}`]);
          setErrorCount((prev) => prev + 1);
        },
      }),
  );

  // キーボードハンドラーの初期化
  const [keyboardHandler] = useState(
    () =>
      new KeyboardHandler({
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
            setStatus("ready");
            setMode("command");
          }
        },
        onClear: () => {
          clearTerminal({ scrollback: true });
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
        },
      }),
  );

  // キーバインドの処理
  useInput((input, key) => {
    keyboardHandler.handleInput(input, key);
  });

  // コマンド実行
  const handleSubmit = (command: string) => {
    if (!command.trim()) return;

    // 履歴に追加
    history.add(command);
    history.resetPosition();

    // ユーザー入力を履歴に表示（枠組み付きで表示されるようにプレフィックスを付ける）
    setOutputLines((prev) => [...prev, `USER_INPUT:${command}`]);

    // エコーバックフィルタリング用に最後に送信したコマンドを設定
    streamProcessor.setLastSentCommand(command);

    // 入力欄をクリアし、実行中コマンドを記録
    setInputValue("");
    setCurrentCommand(command);

    // 実行は CommandExecutor に委譲
    commandExecutor.execute(command, mode).catch((error) => {
      setOutputLines((prev) => [
        ...prev,
        `❌ Error executing command: ${error instanceof Error ? error.message : String(error)}`,
      ]);
      setStatus("error");
    });
  };

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="Qube"
        version={version}
        connected={sessionInitialized && session.running}
      />
      
      {/* QUBEロゴを常に表示 */}
      <QubeTitle />
      
      <Output
        lines={outputLines}
        currentProgressLine={currentProgressLine}
      />
      <Input
        value={inputValue}
        placeholder={!sessionInitialized ? "Initializing..." : "Enter Q command..."}
        disabled={!sessionInitialized || (status === "running" && mode === "command")}
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
