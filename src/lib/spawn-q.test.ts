import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawnQ, type SpawnQOptions } from './spawn-q.ts'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import child_process from 'node:child_process'
import * as qCliDetector from './q-cli-detector.ts'

vi.mock('./q-cli-detector.ts')
vi.mock('node:child_process')

describe('spawnQ関数', () => {
  let mockChildProcess: any

  beforeEach(() => {
    vi.resetAllMocks()
    
    // detectQCLIのモックを設定
    vi.mocked(qCliDetector.detectQCLI).mockResolvedValue('/usr/local/bin/amazonq')
    
    // child_processのモックを作成
    mockChildProcess = new EventEmitter()
    mockChildProcess.stdout = new Readable({
      read() {}
    })
    mockChildProcess.stderr = new Readable({
      read() {}
    })
    mockChildProcess.kill = vi.fn()
    mockChildProcess.pid = 12345
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('コマンドを実行し、標準出力を返す', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const resultPromise = spawnQ(['--help'])

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // 標準出力にデータを流す
    mockChildProcess.stdout.push('Amazon Q CLI Help\n')
    mockChildProcess.stdout.push('Version: 1.0.0\n')
    mockChildProcess.stdout.push(null) // ストリーム終了

    // プロセス正常終了
    mockChildProcess.emit('close', 0)

    // Act
    const result = await resultPromise

    // Assert
    expect(result.stdout).toBe('Amazon Q CLI Help\nVersion: 1.0.0\n')
    expect(result.stderr).toBe('')
    expect(result.exitCode).toBe(0)
    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/amazonq',
      ['--help'],
      expect.objectContaining({
        stdio: ['inherit', 'pipe', 'pipe']
      })
    )
  })

  it('標準エラー出力も取得する', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const resultPromise = spawnQ(['invalid-command'])

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // 標準エラー出力にデータを流す
    mockChildProcess.stderr.push('Error: Unknown command\n')
    mockChildProcess.stderr.push(null)
    mockChildProcess.stdout.push(null)

    // プロセス異常終了
    mockChildProcess.emit('close', 1)

    // Act
    const result = await resultPromise

    // Assert
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Error: Unknown command\n')
    expect(result.exitCode).toBe(1)
  })

  it('タイムアウト時にエラーをスローする', async () => {
    // Arrange
    vi.useFakeTimers()
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const options: SpawnQOptions = { timeout: 1000 }
    const resultPromise = spawnQ(['long-running-command'], options)

    // タイムアウトを発生させる
    await vi.advanceTimersByTimeAsync(1000)

    // Act & Assert
    await expect(resultPromise).rejects.toThrow('コマンドがタイムアウトしました (1秒)')
    expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('プロセス起動エラー時にエラーをスローする', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const resultPromise = spawnQ(['test'])

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // プロセスエラーを発生させる
    mockChildProcess.emit('error', new Error('spawn error'))

    // Act & Assert
    await expect(resultPromise).rejects.toThrow('Q CLIの起動に失敗しました: spawn error')
  })

  it('onDataコールバックでストリーミングデータを受け取る', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const options: SpawnQOptions = {
      onData: (type, data) => {
        if (type === 'stdout') {
          stdoutChunks.push(data)
        } else {
          stderrChunks.push(data)
        }
      }
    }

    const resultPromise = spawnQ(['stream-test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // ストリーミングデータを流す
    mockChildProcess.stdout.push('chunk1')
    mockChildProcess.stdout.push('chunk2')
    mockChildProcess.stderr.push('error1')
    mockChildProcess.stdout.push(null)
    mockChildProcess.stderr.push(null)
    mockChildProcess.emit('close', 0)

    // Act
    await resultPromise

    // Assert
    expect(stdoutChunks).toEqual(['chunk1', 'chunk2'])
    expect(stderrChunks).toEqual(['error1'])
  })

  it('環境変数を渡すことができる', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const options: SpawnQOptions = {
      env: { CUSTOM_VAR: 'test-value' }
    }

    const resultPromise = spawnQ(['test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    mockChildProcess.stdout.push(null)
    mockChildProcess.stderr.push(null)
    mockChildProcess.emit('close', 0)

    // Act
    await resultPromise

    // Assert
    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/amazonq',
      ['test'],
      expect.objectContaining({
        env: expect.objectContaining({
          CUSTOM_VAR: 'test-value'
        })
      })
    )
  })

  it('作業ディレクトリを指定できる', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess)
    vi.mocked(child_process.spawn).mockImplementation(mockSpawn)

    const options: SpawnQOptions = {
      cwd: '/custom/working/directory'
    }

    const resultPromise = spawnQ(['test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    mockChildProcess.stdout.push(null)
    mockChildProcess.stderr.push(null)
    mockChildProcess.emit('close', 0)

    // Act
    await resultPromise

    // Assert
    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/amazonq',
      ['test'],
      expect.objectContaining({
        cwd: '/custom/working/directory'
      })
    )
  })
})