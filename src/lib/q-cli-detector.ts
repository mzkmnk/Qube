import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Amazon Q CLIのバイナリパスを検出する
 * 検出優先順位:
 * 1. Q_BIN環境変数
 * 2. PATHから'amazonq'
 * 3. PATHから'q'
 */
export async function detectQCLI(): Promise<string> {
  // Q_BIN環境変数が設定されている場合
  if (process.env.Q_BIN) {
    try {
      const { stdout } = await execAsync(`which ${process.env.Q_BIN}`)
      return stdout.trim()
    } catch {
      throw new Error(
        'Amazon Q CLI が見つかりません。Q_BIN 環境変数を設定するか、amazonq をインストールしてください。'
      )
    }
  }

  // PATHから検索
  const candidates = ['amazonq', 'q']
  
  for (const candidate of candidates) {
    try {
      const { stdout } = await execAsync(`which ${candidate}`)
      return stdout.trim()
    } catch {
      // 次の候補を試す
      continue
    }
  }

  // すべての候補が見つからなかった場合
  throw new Error(
    'Amazon Q CLI が見つかりません。Q_BIN 環境変数を設定するか、amazonq をインストールしてください。'
  )
}