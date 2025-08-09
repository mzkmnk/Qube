#!/usr/bin/env tsx

import { detectQCLI, spawnQ } from '../lib/index.js'

async function main() {
  try {
    // Q CLIの検出
    console.log('Q CLIを検出中...')
    const qPath = await detectQCLI()
    console.log(`✓ Q CLIが見つかりました: ${qPath}`)
    
    // ヘルプコマンドを実行
    console.log('\n--helpコマンドを実行中...')
    const result = await spawnQ(['--help'], {
      onData: (type, data) => {
        if (type === 'stdout') {
          process.stdout.write(data)
        } else {
          process.stderr.write(data)
        }
      }
    })
    
    console.log(`\n✓ コマンドが完了しました (終了コード: ${result.exitCode})`)
  } catch (error) {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  }
}

main()