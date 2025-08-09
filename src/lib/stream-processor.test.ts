import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import { StreamProcessor, processStream } from './stream-processor.ts'

describe('StreamProcessor', () => {
  /**
   * テスト用のReadableストリームを作成
   */
  function createTestStream(data: string[]): Readable {
    return Readable.from(data.join('\n'))
  }
  
  describe('行単位での処理', () => {
    it('改行で分割された行を個別に処理できる', async () => {
      const stream = createTestStream(['line1', 'line2', 'line3'])
      const lines = await processStream(stream)
      
      expect(lines).toHaveLength(3)
      expect(lines[0].text).toBe('line1')
      expect(lines[1].text).toBe('line2')
      expect(lines[2].text).toBe('line3')
    })
    
    it('空行をスキップする', async () => {
      const stream = createTestStream(['line1', '', 'line2', '  ', 'line3'])
      const processor = new StreamProcessor()
      const lines: string[] = []
      
      processor.processStream(stream, (line) => {
        lines.push(line.text)
      })
      
      await new Promise(resolve => stream.on('end', resolve))
      
      expect(lines).toHaveLength(3)
      expect(lines).toEqual(['line1', 'line2', 'line3'])
    })
  })
  
  describe('ANSIエスケープシーケンスの処理', () => {
    it('ANSIエスケープシーケンスを除去できる', () => {
      const processor = new StreamProcessor({ preserveAnsi: false })
      const result = processor.processLine('\x1b[31mRed Text\x1b[0m')
      
      expect(result.text).toBe('Red Text')
      expect(result.raw).toContain('\x1b[31m')
    })
    
    it('preserveAnsiオプションでANSIを保持できる', () => {
      const processor = new StreamProcessor({ preserveAnsi: true })
      const result = processor.processLine('\x1b[31mRed Text\x1b[0m')
      
      expect(result.text).toContain('\x1b[31m')
    })
  })
  
  describe('JSON検出と整形', () => {
    it('有効なJSONを検出して整形できる', () => {
      const processor = new StreamProcessor({ formatJson: true })
      const result = processor.processLine('{"name":"test","value":123}')
      
      expect(result.type).toBe('json')
      expect(result.json).toEqual({ name: 'test', value: 123 })
      expect(result.text).toContain('{\n  "name": "test",\n  "value": 123\n}')
    })
    
    it('配列形式のJSONも処理できる', () => {
      const processor = new StreamProcessor({ formatJson: true })
      const result = processor.processLine('[1,2,3]')
      
      expect(result.type).toBe('json')
      expect(result.json).toEqual([1, 2, 3])
    })
    
    it('無効なJSONは通常のテキストとして扱う', () => {
      const processor = new StreamProcessor({ formatJson: true })
      const result = processor.processLine('{invalid json}')
      
      expect(result.type).toBe('normal')
      expect(result.json).toBeUndefined()
    })
    
    it('formatJsonが無効な場合はJSON検出をスキップする', () => {
      const processor = new StreamProcessor({ formatJson: false })
      const result = processor.processLine('{"valid":"json"}')
      
      expect(result.type).toBe('normal')
      expect(result.json).toBeUndefined()
    })
  })
  
  describe('エラーパターン検出', () => {
    it('エラーキーワードを検出してerrorタイプにする', () => {
      const processor = new StreamProcessor({ detectErrors: true })
      const errorMessages = [
        'Error: Something went wrong',
        'Failed to connect',
        'Exception occurred',
        'Fatal error',
        'Operation failure'
      ]
      
      for (const msg of errorMessages) {
        const result = processor.processLine(msg)
        expect(result.type).toBe('error')
      }
    })
    
    it('警告キーワードを検出してwarningタイプにする', () => {
      const processor = new StreamProcessor({ detectErrors: true })
      const warningMessages = [
        'Warning: deprecated function',
        'WARN: low memory',
        'Caution: unstable feature',
        'This is deprecated'
      ]
      
      for (const msg of warningMessages) {
        const result = processor.processLine(msg)
        expect(result.type).toBe('warning')
      }
    })
    
    it('大文字小文字を区別しない', () => {
      const processor = new StreamProcessor({ detectErrors: true })
      
      expect(processor.processLine('ERROR: test').type).toBe('error')
      expect(processor.processLine('error: test').type).toBe('error')
      expect(processor.processLine('Error: test').type).toBe('error')
    })
    
    it('detectErrorsが無効な場合はエラー検出をスキップする', () => {
      const processor = new StreamProcessor({ detectErrors: false })
      const result = processor.processLine('Error: Something went wrong')
      
      expect(result.type).toBe('normal')
    })
  })
  
  describe('LineAccumulator', () => {
    it('不完全な行をバッファリングできる', () => {
      const processor = new StreamProcessor()
      const accumulator = processor.createLineAccumulator()
      
      // 最初のチャンク（改行なし）
      let lines = accumulator.add('Hello ')
      expect(lines).toHaveLength(0)
      
      // 2番目のチャンク（改行あり）
      lines = accumulator.add('World\nNext line')
      expect(lines).toHaveLength(1)
      expect(lines[0].text).toBe('Hello World')
      
      // フラッシュで残りを取得
      lines = accumulator.flush()
      expect(lines).toHaveLength(1)
      expect(lines[0].text).toBe('Next line')
    })
    
    it('複数行を含むチャンクを処理できる', () => {
      const processor = new StreamProcessor()
      const accumulator = processor.createLineAccumulator()
      
      const lines = accumulator.add('line1\nline2\nline3\n')
      expect(lines).toHaveLength(3)
      expect(lines.map(l => l.text)).toEqual(['line1', 'line2', 'line3'])
    })
    
    it('JSONが複数チャンクにまたがっても処理できる', () => {
      const processor = new StreamProcessor({ formatJson: true })
      const accumulator = processor.createLineAccumulator()
      
      // 不完全なJSON
      let lines = accumulator.add('{"name"')
      expect(lines).toHaveLength(0)
      
      // 完成
      lines = accumulator.add(':"test"}\n')
      expect(lines).toHaveLength(1)
      expect(lines[0].type).toBe('json')
      expect(lines[0].json).toEqual({ name: 'test' })
    })
  })
  
  describe('統合テスト', () => {
    it('複雑なログストリームを処理できる', async () => {
      const logData = [
        'Starting application...',
        '{"level":"info","message":"Server started","port":3000}',
        'Warning: Using deprecated API',
        'Error: Connection failed',
        'Normal log message',
        '["item1","item2","item3"]'
      ]
      
      const stream = createTestStream(logData)
      const lines = await processStream(stream)
      
      expect(lines).toHaveLength(6)
      expect(lines[0].type).toBe('normal')
      expect(lines[1].type).toBe('json')
      expect(lines[2].type).toBe('warning')
      expect(lines[3].type).toBe('error')
      expect(lines[4].type).toBe('normal')
      expect(lines[5].type).toBe('json')
    })
  })
})