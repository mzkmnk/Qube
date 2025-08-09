import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QSession } from './q-session.js';
import * as childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';

// モックの設定
vi.mock('node:child_process');
vi.mock('./q-cli-detector.ts', () => ({
  detectQCLI: vi.fn().mockResolvedValue('/usr/local/bin/q')
}));

describe('QSession', () => {
  let session: QSession;
  let mockProcess: any;

  beforeEach(() => {
    session = new QSession();
    
    // モックプロセスの作成
    mockProcess = new EventEmitter();
    mockProcess.stdin = {
      write: vi.fn()
    };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();
    
    vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('セッションを開始できる', async () => {
    await session.start('chat');
    
    expect(childProcess.spawn).toHaveBeenCalledWith(
      '/usr/local/bin/q',
      ['chat'],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe']
      })
    );
    expect(session.running).toBe(true);
  });

  it('既に開始されているセッションを再度開始しようとするとエラーになる', async () => {
    await session.start('chat');
    
    await expect(session.start('chat')).rejects.toThrow('セッションは既に開始されています');
  });

  it('標準出力からのデータをイベントとして発行する', async () => {
    const dataHandler = vi.fn();
    session.on('data', dataHandler);
    
    await session.start('chat');
    mockProcess.stdout.emit('data', Buffer.from('Hello from Q'));
    
    expect(dataHandler).toHaveBeenCalledWith('stdout', 'Hello from Q');
  });

  it('標準エラー出力からのデータをイベントとして発行する', async () => {
    const dataHandler = vi.fn();
    session.on('data', dataHandler);
    
    await session.start('chat');
    mockProcess.stderr.emit('data', Buffer.from('Error message'));
    
    expect(dataHandler).toHaveBeenCalledWith('stderr', 'Error message');
  });

  it('セッションに入力を送信できる', async () => {
    await session.start('chat');
    
    session.send('Hello Q');
    
    expect(mockProcess.stdin.write).toHaveBeenCalledWith('Hello Q\n');
  });

  it('セッションが開始されていない場合、入力送信はエラーになる', () => {
    expect(() => session.send('Hello')).toThrow('セッションが開始されていません');
  });

  it('セッションを停止できる', async () => {
    await session.start('chat');
    
    session.stop();
    
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    expect(session.running).toBe(false);
  });

  it('プロセスが終了したときにexitイベントを発行する', async () => {
    const exitHandler = vi.fn();
    session.on('exit', exitHandler);
    
    await session.start('chat');
    mockProcess.emit('exit', 0);
    
    expect(exitHandler).toHaveBeenCalledWith(0);
    expect(session.running).toBe(false);
  });

  it('プロセスエラーが発生したときにerrorイベントを発行する', async () => {
    const errorHandler = vi.fn();
    const error = new Error('Process error');
    session.on('error', errorHandler);
    
    await session.start('chat');
    mockProcess.emit('error', error);
    
    expect(errorHandler).toHaveBeenCalledWith(error);
    expect(session.running).toBe(false);
  });
});