import { QSession } from './q-session.js';
import { StreamProcessor, ProcessedLine } from './stream-processor.js';

/**
 * ストリーム処理機能を持つQ CLIセッション
 */
export class EnhancedQSession extends QSession {
  private processor: StreamProcessor;
  private stdoutAccumulator: ReturnType<StreamProcessor['createLineAccumulator']>;
  private stderrAccumulator: ReturnType<StreamProcessor['createLineAccumulator']>;
  
  constructor() {
    super();
    
    this.processor = new StreamProcessor({
      formatJson: true,
      detectErrors: true,
      preserveAnsi: false
    });
    
    this.stdoutAccumulator = this.processor.createLineAccumulator();
    this.stderrAccumulator = this.processor.createLineAccumulator();
    
    // 元のdataイベントをラップ
    this.on('data', (type: string, data: string) => {
      const accumulator = type === 'stdout' ? this.stdoutAccumulator : this.stderrAccumulator;
      const lines = accumulator.add(data);
      
      // 処理済みの行をemit
      for (const line of lines) {
        this.emit('processedLine', type, line);
      }
    });
  }
  
  /**
   * セッションを停止（オーバーライド）
   */
  override stop(): void {
    // 残りのバッファをフラッシュ
    const stdoutRemaining = this.stdoutAccumulator.flush();
    for (const line of stdoutRemaining) {
      this.emit('processedLine', 'stdout', line);
    }
    
    const stderrRemaining = this.stderrAccumulator.flush();
    for (const line of stderrRemaining) {
      this.emit('processedLine', 'stderr', line);
    }
    
    super.stop();
  }
}