/**
 * ストリーム処理に関するユーティリティ
 * App.tsxから分離して単一責任原則を適用
 */

export interface StreamProcessorConfig {
  onLinesReady: (lines: string[]) => void;
  onProgressUpdate: (line: string | null) => void;
}

export class StreamProcessor {
  private buffer = "";
  private currentProgressLine: string | null = null;
  private config: StreamProcessorConfig;

  constructor(config: StreamProcessorConfig) {
    this.config = config;
  }

  /**
   * ストリームデータを処理
   * Thinking行の抑制とCR進捗処理を行う
   */
  processData(_type: string, data: string): void {
    // CRLF正規化（ANSIや色は保持）
    let merged = (this.buffer + data).replace(/\r\n/g, "\n");

    // CR（キャリッジリターン）を利用した進捗行の更新
    if (merged.includes("\r")) {
      const crParts = merged.split("\r");
      const lastPart = crParts[crParts.length - 1];

      // 進捗パターンの検出
      const progressPatterns = [
        /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*\.{3}/, // スピナー + ...
        /Loading\.\.\./,
        /Processing\.\.\./,
        /Downloading|Uploading|Indexing/i,
      ];

      if (progressPatterns.some((p) => p.test(lastPart))) {
        this.currentProgressLine = lastPart.trim();
        this.config.onProgressUpdate(this.currentProgressLine);
      }

      // 最新内容のみを対象にして以降の処理を行う
      merged = lastPart;
    }

    const parts = merged.split("\n");
    const incomplete = parts.pop() || "";
    const linesToAdd: string[] = [];

    // 改行が来たタイミングで、進捗行が存在すれば1回だけ履歴に残す
    if (parts.length > 0 && this.currentProgressLine) {
      linesToAdd.push(this.currentProgressLine);
      this.currentProgressLine = null;
      this.config.onProgressUpdate(null);
    }

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Thinking... 系の行は抑制
      if (trimmed === "Thinking..." || trimmed.includes("Thinking..."))
        continue;

      linesToAdd.push(line);
    }

    this.buffer = incomplete;

    if (linesToAdd.length > 0) {
      this.config.onLinesReady(linesToAdd);
    }
  }

  /**
   * 現在の進捗行を取得
   */
  getCurrentProgressLine(): string | null {
    return this.currentProgressLine;
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.buffer = "";
    this.currentProgressLine = null;
  }
}
