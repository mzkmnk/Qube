import { spawn, type SpawnOptions } from 'node:child_process'
import { detectQCLI } from './q-cli-detector.js'

export interface SpawnQOptions {
  /** タイムアウト（ミリ秒） */
  timeout?: number
  /** 環境変数 */
  env?: Record<string, string>
  /** 作業ディレクトリ */
  cwd?: string
  /** ストリーミングデータのコールバック */
  onData?: (type: 'stdout' | 'stderr', data: string) => void
}

export interface SpawnQResult {
  /** 標準出力 */
  stdout: string
  /** 標準エラー出力 */
  stderr: string
  /** 終了コード */
  exitCode: number | null
}

/**
 * Amazon Q CLIをspawnして実行する
 * @param args コマンドライン引数
 * @param options オプション
 */
export async function spawnQ(
  args: string[],
  options: SpawnQOptions = {}
): Promise<SpawnQResult> {
  const qBinaryPath = await detectQCLI()
  
  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: options.env ? { ...process.env, ...options.env } : process.env,
      cwd: options.cwd
    }

    const child = spawn(qBinaryPath, args, spawnOptions)
    
    let stdout = ''
    let stderr = ''
    let timeoutId: NodeJS.Timeout | undefined
    let isResolved = false

    // タイムアウト設定
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          child.kill('SIGTERM')
          isResolved = true
          reject(new Error(`コマンドがタイムアウトしました (${options.timeout! / 1000}秒)`))
        }
      }, options.timeout)
    }

    // 標準出力の処理
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const data = chunk.toString()
        stdout += data
        options.onData?.('stdout', data)
      })
    }

    // 標準エラー出力の処理
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        const data = chunk.toString()
        stderr += data
        options.onData?.('stderr', data)
      })
    }

    // プロセスエラーの処理
    child.on('error', (error) => {
      if (!isResolved) {
        if (timeoutId) clearTimeout(timeoutId)
        isResolved = true
        reject(new Error(`Q CLIの起動に失敗しました: ${error.message}`))
      }
    })

    // プロセス終了の処理
    child.on('close', (code) => {
      if (!isResolved) {
        if (timeoutId) clearTimeout(timeoutId)
        isResolved = true
        resolve({
          stdout,
          stderr,
          exitCode: code
        })
      }
    })
  })
}