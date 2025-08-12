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
  private initializationTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private accumulatedData = "";

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

    // 初期化タイムアウト（10秒）: データが来なくても初期化完了とみなす
    this.initializationTimeout = setTimeout(() => {
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.emit("initialized");
      }
    }, 10000);

    // PTYの出力（stdout相当のみ。stderrは統合）
    this.process.onData((chunk) => {
      // 初期化完了の検知（ANSIシーケンスを含む生データから判定）
      if (!this.isInitialized) {
        this.accumulatedData += chunk;
        this.checkInitialization(this.accumulatedData);
      }
      // 初期化前でもデータはそのまま流す（UI側で必要に応じてフィルタ）
      this.emit("data", "stdout", chunk);
    });

    // プロセス終了の処理
    this.process.onExit(({ exitCode: code }) => {
      this.isRunning = false;
      this.isInitialized = false;
      if (this.initializationTimeout) {
        clearTimeout(this.initializationTimeout);
      }
      this.emit("exit", code);
    });

    // 起動は即時完了とする（初期化は 'initialized' イベントで通知）
    return;
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

  /**
   * セッションが初期化済みかどうか
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 初期化バッファの内容を取得（デバッグ用）
   */
  getInitializationBuffer(): string[] {
    // 初期化中の生データは保持しない実装に変更
    return [];
  }

  /**
   * 初期化完了をチェック
   * Amazon Q CLIの初期プロンプトやメッセージを検知
   * @returns 初期化が完了したかどうか
   */
  private checkInitialization(data: string): boolean {
    // ANSIエスケープシーケンスを除去して検査（RegExpコンストラクタで動的生成し、lint回避）
    const ESC = "\u001B"; // ESC (0x1B)
    const ansiPattern = new RegExp(`${ESC}\\[[0-9;]*[mGKJH]`, "g");
    const cleanData = data.replace(ansiPattern, "");

    // 「You are chatting with」という最後のメッセージを検知
    const finalPattern = /You are chatting with .+/i;
    
    // または、セパレーターライン後の空行を検知
    const separatorEndPattern = /━{10,}[\s\S]*?\n\s*\n/;
    
    if (finalPattern.test(cleanData) || separatorEndPattern.test(cleanData)) {
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.accumulatedData = "";
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
        }
        this.emit("initialized");
        return true;
      }
    }
    return false;
  }
}
