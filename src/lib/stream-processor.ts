import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import stripAnsi from 'strip-ansi'
import chalk from 'chalk'

/**
 * ストリーム処理のオプション
 */
export interface StreamProcessorOptions {
  /** JSONの自動検出と整形を有効にするか */
  formatJson?: boolean
  /** エラーパターンの検出と色付けを有効にするか */
  detectErrors?: boolean
  /** ANSIエスケープシーケンスを保持するか */
  preserveAnsi?: boolean
}

/**
 * 処理された行のデータ
 */
export interface ProcessedLine {
  /** 元の生データ */
  raw: string
  /** 処理済みのテキスト */
  text: string
  /** 行のタイプ */
  type: 'normal' | 'error' | 'warning' | 'json'
  /** JSON形式の場合のパース済みデータ */
  json?: unknown
}

/**
 * エラーパターンの正規表現
 */
const ERROR_PATTERN = /\b(error|failed|exception|failure|fatal)\b/i
const WARNING_PATTERN = /\b(warning|warn|caution|deprecated)\b/i

/**
 * ストリームプロセッサーのクラス
 * 行単位でストリームを処理し、整形・色付けを行う
 */
export class StreamProcessor {
  private options: StreamProcessorOptions
  
  constructor(options: StreamProcessorOptions = {}) {
    this.options = {
      formatJson: true,
      detectErrors: true,
      preserveAnsi: false,
      ...options
    }
  }
  
  /**
   * ストリームを行単位で処理する
   * @param stream 処理対象のReadableストリーム
   * @param onLine 各行を処理するコールバック
   */
  processStream(
    stream: Readable,
    onLine: (line: ProcessedLine) => void
  ): void {
    const rl = createInterface({
      input: stream,
      crlfDelay: Infinity // Windows/Unix改行の違いを吸収
    })
    
    rl.on('line', (line: string) => {
      // 空行はスキップ
      if (line.trim()) {
        const processed = this.processLine(line)
        onLine(processed)
      }
    })
  }
  
  /**
   * 単一行を処理する
   * @param line 処理対象の行
   */
  processLine(line: string): ProcessedLine {
    // ANSIエスケープシーケンスの処理
    const cleanLine = this.options.preserveAnsi ? line : stripAnsi(line)
    
    // JSONの検出と整形
    if (this.options.formatJson) {
      const jsonResult = this.tryParseJson(cleanLine)
      if (jsonResult) {
        return {
          raw: line,
          text: this.formatJson(jsonResult),
          type: 'json',
          json: jsonResult
        }
      }
    }
    
    // エラー/警告パターンの検出
    if (this.options.detectErrors) {
      if (ERROR_PATTERN.test(cleanLine)) {
        return {
          raw: line,
          text: chalk.red(cleanLine),
          type: 'error'
        }
      }
      
      if (WARNING_PATTERN.test(cleanLine)) {
        return {
          raw: line,
          text: chalk.yellow(cleanLine),
          type: 'warning'
        }
      }
    }
    
    // 通常の行
    return {
      raw: line,
      text: cleanLine,
      type: 'normal'
    }
  }
  
  /**
   * JSON文字列のパースを試みる
   * @param text パース対象のテキスト
   */
  private tryParseJson(text: string): unknown | null {
    // JSONっぽいパターンを検出（{} または [] で始まる）
    const trimmed = text.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null
    }
    
    try {
      return JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  
  /**
   * JSONオブジェクトを整形して文字列にする
   * @param json JSONオブジェクト
   */
  private formatJson(json: unknown): string {
    try {
      const formatted = JSON.stringify(json, null, 2)
      return chalk.cyan(formatted)
    } catch {
      return String(json)
    }
  }
  
  /**
   * 複数行のバッファを処理する
   * ストリーミング中の不完全なJSONなどを扱う
   */
  createLineAccumulator() {
    let buffer = ''
    
    return {
      /**
       * データを追加してバッファに蓄積
       * @param chunk データチャンク
       */
      add: (chunk: string): ProcessedLine[] => {
        buffer += chunk
        const lines: ProcessedLine[] = []
        
        // 改行で分割して処理
        const parts = buffer.split('\n')
        
        // 最後の要素は次のチャンクで継続する可能性があるため保持
        buffer = parts.pop() || ''
        
        // 完成した行を処理
        for (const line of parts) {
          if (line.trim()) {
            lines.push(this.processLine(line))
          }
        }
        
        return lines
      },
      
      /**
       * 残りのバッファをフラッシュ
       */
      flush: (): ProcessedLine[] => {
        if (buffer.trim()) {
          const result = [this.processLine(buffer)]
          buffer = ''
          return result
        }
        return []
      }
    }
  }
}

/**
 * ストリーム処理のヘルパー関数
 * @param stream 処理対象のストリーム
 * @param options オプション
 */
export function processStream(
  stream: Readable,
  options?: StreamProcessorOptions
): Promise<ProcessedLine[]> {
  return new Promise((resolve) => {
    const processor = new StreamProcessor(options)
    const lines: ProcessedLine[] = []
    
    processor.processStream(stream, (line) => {
      lines.push(line)
    })
    
    stream.on('end', () => {
      resolve(lines)
    })
  })
}