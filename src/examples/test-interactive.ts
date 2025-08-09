#!/usr/bin/env tsx

import { spawn } from 'node:child_process'
import { detectQCLI } from '../lib/index.ts'
import readline from 'node:readline'

/**
 * インタラクティブセッションのテスト
 * Q CLIをインタラクティブモードで起動し、標準入出力を接続
 */
async function main() {
  try {
    const qPath = await detectQCLI()
    console.log(`Q CLIを起動中: ${qPath}\n`)
    
    // Q CLIをインタラクティブモードで起動
    // stdin, stdout, stderrを継承してTTYモードを維持
    const child = spawn(qPath, ['chat'], {
      stdio: 'inherit',  // 親プロセスのstdin/stdout/stderrを継承
      env: process.env
    })
    
    // プロセス終了時の処理
    child.on('exit', (code) => {
      console.log(`\nQ CLIが終了しました (code: ${code})`)
      process.exit(code || 0)
    })
    
    // エラーハンドリング
    child.on('error', (err) => {
      console.error('エラー:', err)
      process.exit(1)
    })
    
    // Ctrl+Cのハンドリング
    process.on('SIGINT', () => {
      child.kill('SIGINT')
    })
    
  } catch (error) {
    console.error('起動エラー:', error)
    process.exit(1)
  }
}

main()