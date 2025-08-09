import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { detectQCLI } from './q-cli-detector.ts'
import { Readable, Writable } from 'node:stream'

/**
 * Q CLIの永続的セッションを管理するクラス
 * chatモードのようなインタラクティブセッションに対応
 */
export class QSession extends EventEmitter {
  private process: ChildProcess | null = null
  private isRunning = false
  
  /**
   * セッションを開始
   * @param mode セッションモード（'chat' | 'translate' など）
   */
  async start(mode: string = 'chat'): Promise<void> {
    if (this.isRunning) {
      throw new Error('セッションは既に開始されています')
    }
    
    const qPath = await detectQCLI()
    
    // Q CLIをインタラクティブモードで起動
    this.process = spawn(qPath, [mode], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    })
    
    this.isRunning = true
    
    // 標準出力の処理
    this.process.stdout?.on('data', (chunk) => {
      this.emit('data', 'stdout', chunk.toString())
    })
    
    // 標準エラー出力の処理
    this.process.stderr?.on('data', (chunk) => {
      this.emit('data', 'stderr', chunk.toString())
    })
    
    // プロセス終了の処理
    this.process.on('exit', (code) => {
      this.isRunning = false
      this.emit('exit', code)
    })
    
    // エラーの処理
    this.process.on('error', (error) => {
      this.isRunning = false
      this.emit('error', error)
    })
  }
  
  /**
   * セッションに入力を送信
   * @param input 送信するテキスト
   */
  send(input: string): void {
    if (!this.isRunning || !this.process?.stdin) {
      throw new Error('セッションが開始されていません')
    }
    
    // 改行を追加して送信
    this.process.stdin.write(input + '\n')
  }
  
  /**
   * セッションを終了
   */
  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.isRunning = false
    }
  }
  
  /**
   * セッションが実行中かどうか
   */
  get running(): boolean {
    return this.isRunning
  }
}