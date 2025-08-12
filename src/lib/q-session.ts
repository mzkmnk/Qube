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
  private initializationResolve: (() => void) | null = null;
  private initializationReject: ((error: Error) => void) | null = null;
  private initializationTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private initializationBuffer: string[] = [];
  private suppressInitOutput = true;
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

    // 初期化完了を待つPromiseを設定
    const initPromise = new Promise<void>((resolve, reject) => {
      this.initializationResolve = resolve;
      this.initializationReject = reject;

      // 初期化タイムアウト（10秒）
      this.initializationTimeout = setTimeout(() => {
        if (!this.isInitialized) {
          this.isInitialized = true; // タイムアウトでも初期化完了とみなす
          resolve();
          this.emit("initialized");
        }
      }, 10000);
    });

    // PTYの出力（stdout相当のみ。stderrは統合）
    this.process.onData((chunk) => {
      // 初期化完了の検知
      if (!this.isInitialized) {
        this.accumulatedData += chunk;
        const wasInitialized = this.checkInitialization(this.accumulatedData);
        // 初期化中は出力をバッファに保存（デバッグや後で必要な場合のため）
        this.initializationBuffer.push(chunk);
        // 初期化完了まで出力を抑制（初期化完了を検知したchunkも含む）
        if (this.suppressInitOutput || wasInitialized) {
          return;
        }
      }
      this.emit("data", "stdout", chunk);
    });

    // プロセス終了の処理
    this.process.onExit(({ exitCode: code }) => {
      this.isRunning = false;
      this.isInitialized = false;
      if (this.initializationTimeout) {
        clearTimeout(this.initializationTimeout);
      }
      if (this.initializationReject && !this.isInitialized) {
        this.initializationReject(new Error("プロセスが初期化前に終了しました"));
      }
      this.emit("exit", code);
    });

    // 初期化完了を待つ
    await initPromise;
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
    return [...this.initializationBuffer];
  }

  /**
   * 初期化完了をチェック
   * Amazon Q CLIの初期プロンプトやメッセージを検知
   * @returns 初期化が完了したかどうか
   */
  private checkInitialization(data: string): boolean {
    // ANSIエスケープシーケンスを除去して検査
    // eslint-disable-next-line no-control-regex
    const cleanData = data.replace(/\x1b\[[0-9;]*[mGKJH]/g, "");

    // 「You are chatting with」という最後のメッセージを検知
    const finalPattern = /You are chatting with .+/i;
    
    // または、セパレーターライン後の空行を検知
    const separatorEndPattern = /━{10,}[\s\S]*?\n\s*\n/;
    
    if (finalPattern.test(cleanData) || separatorEndPattern.test(cleanData)) {
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.suppressInitOutput = false;
        // バッファをクリア（初期メッセージは破棄）
        this.initializationBuffer = [];
        this.accumulatedData = "";
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
        }
        if (this.initializationResolve) {
          this.initializationResolve();
        }
        this.emit("initialized");
        return true;
      }
    }
    return false;
  }
}
