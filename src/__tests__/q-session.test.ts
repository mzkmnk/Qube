import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QSession } from '../lib/q-session';
import * as pty from 'node-pty';
import type { IPty } from 'node-pty';

// モックの設定
vi.mock('node-pty');
vi.mock('../lib/q-cli-detector.ts', () => ({
  detectQCLI: vi.fn().mockResolvedValue('/usr/local/bin/q')
}));

describe('QSession', () => {
  let session: QSession;
  let mockPty: IPty & { __emitData: (d: string) => void; __emitExit: (code: number) => void };

  beforeEach(async () => {
    session = new QSession();
    const listeners: { data?: (d: string) => void; exit?: (e: { exitCode: number }) => void } = {};
    mockPty = {
      onData: (cb: (d: string) => void) => { listeners.data = cb; },
      onExit: (cb: (e: { exitCode: number }) => void) => { listeners.exit = cb; },
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      pid: 43210,
      __emitData: (d: string) => listeners.data?.(d),
      __emitExit: (code: number) => listeners.exit?.({ exitCode: code })
    } as any;
    
    vi.mocked(pty.spawn).mockReturnValue(mockPty);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('セッションを開始できる', async () => {
    await session.start('chat');
    
    expect(pty.spawn).toHaveBeenCalledWith(
      '/usr/local/bin/q',
      ['chat'],
      expect.objectContaining({ env: expect.any(Object) })
    );
    expect(session.running).toBe(true);
  });

  it('既に開始されているセッションを再度開始しようとするとエラーになる', async () => {
    await session.start('chat');
    
    await expect(session.start('chat')).rejects.toThrow('セッションは既に開始されています');
  });

  it('PTYのデータをイベントとして発行する', async () => {
    const dataHandler = vi.fn();
    session.on('data', dataHandler);
    
    await session.start('chat');
    mockPty.__emitData('Hello from Q');
    
    expect(dataHandler).toHaveBeenCalledWith('stdout', 'Hello from Q');
  });

  it('セッションに入力を送信できる', async () => {
    await session.start('chat');
    
    session.send('Hello Q');
    
    expect(mockPty.write).toHaveBeenCalledWith('Hello Q\r');
  });

  it('セッションが開始されていない場合、入力送信はエラーになる', () => {
    expect(() => session.send('Hello')).toThrow('セッションが開始されていません');
  });

  it('セッションを停止できる', async () => {
    await session.start('chat');
    
    session.stop();
    
    expect(mockPty.kill).toHaveBeenCalled();
    expect(session.running).toBe(false);
  });

  it('プロセスが終了したときにexitイベントを発行する', async () => {
    const exitHandler = vi.fn();
    session.on('exit', exitHandler);
    
    await session.start('chat');
    mockPty.__emitExit(0);
    
    expect(exitHandler).toHaveBeenCalledWith(0);
    expect(session.running).toBe(false);
  });
});
