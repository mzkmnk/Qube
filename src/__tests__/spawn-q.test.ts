import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawnQ, type SpawnQOptions } from '../lib/spawn-q'
import * as qCliDetector from '../lib/q-cli-detector'
import * as pty from 'node-pty'
import type { IPty } from 'node-pty'

vi.mock('../lib/q-cli-detector')
vi.mock('node-pty')

describe('spawnQ関数', () => {
  let mockPty: IPty & { __emitData: (data: string) => void; __emitExit: (code: number) => void }

  beforeEach(() => {
    vi.resetAllMocks()
    
    // detectQCLIのモックを設定
    vi.mocked(qCliDetector.detectQCLI).mockResolvedValue('/usr/local/bin/amazonq')
    
    // node-ptyのモックを作成
    const listeners: { data?: (d: string) => void; exit?: (e: { exitCode: number }) => void } = {}
    mockPty = {
      onData: (cb: (data: string) => void) => {
        listeners.data = cb
      },
      onExit: (cb: (e: { exitCode: number }) => void) => {
        listeners.exit = cb
      },
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      pid: 12345,
      __emitData: (d: string) => listeners.data?.(d),
      __emitExit: (code: number) => listeners.exit?.({ exitCode: code })
    } as any
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('コマンドを実行し、標準出力を返す', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn).mockImplementation(mockSpawn)

    const resultPromise = spawnQ(['--help'])

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // PTY出力にデータを流す（stderrはPTYでは統合）
    mockPty.__emitData('Amazon Q CLI Help\n')
    mockPty.__emitData('Version: 1.0.0\n')

    // プロセス正常終了
    mockPty.__emitExit(0)

    // Act
    const result = await resultPromise

    // Assert
    expect(result.stdout).toBe('Amazon Q CLI Help\nVersion: 1.0.0\n')
    expect(result.exitCode).toBe(0)
    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/amazonq',
      ['--help'],
      expect.objectContaining({
        cwd: undefined,
        env: expect.any(Object)
      })
    )
  })

  it('TTYではstderrは統合される（stdoutに含まれる）', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn).mockImplementation(mockSpawn)

    const resultPromise = spawnQ(['invalid-command'])

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // PTYでは全てonDataで届く
    mockPty.__emitData('Error: Unknown command\n')
    mockPty.__emitExit(1)

    // Act
    const result = await resultPromise

    // Assert
    expect(result.stdout).toBe('Error: Unknown command\n')
    expect(result.exitCode).toBe(1)
  })

  it('タイムアウト時にエラーをスローする', async () => {
    // Arrange
    vi.useFakeTimers()
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn).mockImplementation(mockSpawn)

    const options: SpawnQOptions = { timeout: 1000 }
    const resultPromise = spawnQ(['long-running-command'], options)

    // 先に拒否ハンドラを登録してからタイマーを進める（未処理拒否を防止）
    const expectation = expect(resultPromise).rejects.toThrow('コマンドがタイムアウトしました (1秒)')

    // タイムアウトを発生させる
    await vi.advanceTimersByTimeAsync(1000)

    // Act & Assert
    await expectation
    expect(mockPty.kill).toHaveBeenCalled()
    
    // クリーンアップ: プロセスのexitイベントを送信
    mockPty.__emitExit(1)
    
    // 残りのタイマーをクリア
    vi.clearAllTimers()
  })

  it('プロセス起動エラー時にエラーをスローする', async () => {
    // Arrange: spawn自体が例外を投げる
    vi.mocked(pty.spawn).mockImplementation(() => { throw new Error('spawn error') as any })

    // Act & Assert
    await expect(spawnQ(['test'])).rejects.toThrow('Q CLIの起動に失敗しました: spawn error')
  })

  it('onDataコールバックでストリーミングデータを受け取る', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn).mockImplementation(mockSpawn)

    const stdoutChunks: string[] = []

    const options: SpawnQOptions = {
      onData: (data) => {
        stdoutChunks.push(data)
      }
    }

    const resultPromise = spawnQ(['stream-test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    // ストリーミングデータを流す（TTYでは統合）
    mockPty.__emitData('chunk1')
    mockPty.__emitData('chunk2')
    mockPty.__emitData('error1')
    mockPty.__emitExit(0)

    // Act
    await resultPromise

    // Assert
    expect(stdoutChunks).toEqual(['chunk1', 'chunk2', 'error1'])
  })

  it('環境変数を渡すことができる', async () => {
    // Arrange
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn).mockImplementation(mockSpawn)

    const options: SpawnQOptions = {
      env: { CUSTOM_VAR: 'test-value' }
    }

    const resultPromise = spawnQ(['test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    mockPty.__emitExit(0)

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
    const pty = await import('node-pty')
    const mockSpawn = vi.fn().mockReturnValue(mockPty)
    vi.mocked(pty.spawn as any).mockImplementation(mockSpawn)

    const options: SpawnQOptions = {
      cwd: '/custom/working/directory'
    }

    const resultPromise = spawnQ(['test'], options)

    // detectQCLIの非同期処理を待つ
    await new Promise(resolve => setImmediate(resolve))

    mockPty.__emitExit(0)

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
