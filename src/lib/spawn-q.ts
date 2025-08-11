import pty, { type IPty } from 'node-pty'
import { detectQCLI } from './q-cli-detector'

export interface SpawnQOptions {
  /** タイムアウト（ミリ秒） */
  timeout?: number
  /** 環境変数 */
  env?: Record<string, string>
  /** 作業ディレクトリ */
  cwd?: string
  /** ストリーミングデータのコールバック */
  onData?: (data: string) => void
}

export interface SpawnQResult {
  /** 出力（TTY統合） */
  stdout: string
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
    const env = options.env ? { ...process.env, ...options.env } : process.env
    let child: IPty
    try {
      child = pty.spawn(qBinaryPath, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: options.cwd,
        env
      })
    } catch (error: any) {
      reject(new Error(`Q CLIの起動に失敗しました: ${error.message}`))
      return
    }
    
    let stdout = ''
    let timeoutId: NodeJS.Timeout | undefined
    let isResolved = false

    // タイムアウト設定
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          child.kill()
          isResolved = true
          reject(new Error(`コマンドがタイムアウトしました (${options.timeout! / 1000}秒)`))
        }
      }, options.timeout)
    }

    // PTYのデータは統合ストリーム
    child.onData((data) => {
      stdout += data
      options.onData?.(data)
    })

    // プロセス終了の処理
    child.onExit(({ exitCode }) => {
      if (!isResolved) {
        if (timeoutId) clearTimeout(timeoutId)
        isResolved = true
        resolve({ stdout, exitCode })
      }
    })
  })
}
