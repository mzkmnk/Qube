import { StreamProcessor, ProcessedLine } from './stream-processor.js';
import { spawnQ, SpawnQOptions, SpawnQResult } from './spawn-q.js';

/**
 * ストリーム処理を強化したspawnQのオプション
 */
export interface EnhancedSpawnOptions extends SpawnQOptions {
  /** 処理済み行のコールバック */
  onProcessedLine?: (line: ProcessedLine) => void;
  /** JSONの自動整形を有効にするか */
  formatJson?: boolean;
  /** エラーパターンの検出を有効にするか */
  detectErrors?: boolean;
}

/**
 * ストリーム処理を強化したspawnQの結果
 */
export interface EnhancedSpawnResult extends SpawnQResult {
  /** 処理済みの出力行 */
  processedLines: ProcessedLine[];
}

/**
 * ストリーム処理機能を持つspawnQ
 * @param args コマンドライン引数
 * @param options オプション
 */
export async function enhancedSpawnQ(
  args: string[],
  options: EnhancedSpawnOptions = {}
): Promise<EnhancedSpawnResult> {
  const processor = new StreamProcessor({
    formatJson: options.formatJson ?? true,
    detectErrors: options.detectErrors ?? true,
    preserveAnsi: false
  });
  
  const accumulator = processor.createLineAccumulator();
  const processedLines: ProcessedLine[] = [];
  
  // 元のonDataコールバックを保存
  const originalOnData = options.onData;
  
  // ストリーム処理を追加
  const enhancedOptions: SpawnQOptions = {
    ...options,
    onData: (type, data) => {
      // 元のコールバックを呼ぶ
      originalOnData?.(type, data);
      
      // ストリーム処理
      const lines = accumulator.add(data);
      for (const line of lines) {
        processedLines.push(line);
        options.onProcessedLine?.(line);
      }
    }
  };
  
  // spawnQを実行
  const result = await spawnQ(args, enhancedOptions);
  
  // 残りのバッファをフラッシュ
  const remainingLines = accumulator.flush();
  for (const line of remainingLines) {
    processedLines.push(line);
    options.onProcessedLine?.(line);
  }
  
  return {
    ...result,
    processedLines
  };
}