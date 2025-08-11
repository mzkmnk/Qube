import pty, { type IPty } from "node-pty";
import { EventEmitter } from "node:events";
import { detectQCLI } from "./q-cli-detector";

/**
 * Q CLIの永続的セッションを管理するクラス
 * chatモードのようなインタラクティブセッションに対応
 */
export class QSession extends EventEmitter {
  private process: IPty | null = null;
  private isRunning = false;

  /**
   * セッションを開始
   * @param mode セッションモード（'chat' | 'translate' など）
   */
  async start(mode: string = "chat"): Promise<void> {
    if (this.isRunning) {
      throw new Error("セッションは既に開始されています");
    }

    const qPath = await detectQCLI();

    // Q CLIをインタラクティブモードで起動
    this.process = pty.spawn(qPath, [mode], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      env: process.env,
    });

    this.isRunning = true;

    // PTYの出力（stdout相当のみ。stderrは統合）
    this.process.onData((chunk) => {
      this.emit("data", "stdout", chunk);
    });

    // プロセス終了の処理
    this.process.onExit(({ exitCode: code }) => {
      this.isRunning = false;
      this.emit("exit", code);
    });

    // node-ptyは生成時に例外を投げるため、ここでのエラーイベントは無し
  }

  /**
   * セッションに入力を送信
   * @param input 送信するテキスト
   */
  send(input: string): void {
    if (!this.isRunning || !this.process) {
      throw new Error("セッションが開始されていません");
    }

    // Enter相当のCRを送信
    this.process.write(input + "\r");
  }

  /**
   * セッションを終了
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isRunning = false;
    }
  }

  /**
   * セッションが実行中かどうか
   */
  get running(): boolean {
    return this.isRunning;
  }
}
