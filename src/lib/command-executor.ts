/**
 * コマンド実行ロジックを管理するクラス
 * App.tsxから分離して単一責任原則を適用
 */

import { QSession } from "./q-session";
import { spawnQ } from "./spawn-q";

export interface CommandExecutorCallbacks {
  onModeChange: (mode: "command" | "session") => void;
  onStatusChange: (status: "ready" | "running" | "error") => void;
  onOutput: (lines: string | string[]) => void;
  onError: (message: string) => void;
}

export class CommandExecutor {
  private session: QSession;
  private callbacks: CommandExecutorCallbacks;

  constructor(session: QSession, callbacks: CommandExecutorCallbacks) {
    this.session = session;
    this.callbacks = callbacks;
  }

  /**
   * コマンドを実行
   */
  async execute(
    command: string,
    currentMode: "command" | "session" = "command",
  ): Promise<void> {
    // 空のコマンドは無視
    if (!command.trim()) return;

    // ステータスを実行中に変更
    this.callbacks.onStatusChange("running");

    try {
      // セッションモードのコマンドか判定
      if (command.startsWith("q chat") || command.startsWith("q translate")) {
        // セッションモードに切り替え
        this.callbacks.onModeChange("session");
        const sessionType = command.split(" ")[1];
        await this.session.start(sessionType);
      } else if (currentMode === "session" && this.session.running) {
        // セッションに入力を送信
        this.session.send(command);
      } else {
        // 通常のコマンド実行
        const args = command.replace(/^q\s+/, "").split(" ");
        const result = await spawnQ(args);

        if (result.stdout) {
          const lines = result.stdout
            .split(/\r?\n|\\n/g)
            .filter((line) => line.length > 0);
          if (lines.length > 0) {
            this.callbacks.onOutput(lines);
          }
        }

        this.callbacks.onStatusChange(
          result.exitCode === 0 ? "ready" : "error",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(message);
      this.callbacks.onStatusChange("error");
    } finally {
      if (!this.session.running) {
        this.callbacks.onStatusChange("ready");
      }
    }
  }
}
