import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandExecutor } from '../lib/command-executor';
import { QSession } from '../lib/q-session';
import { spawnQ } from '../lib/spawn-q';

// モック
vi.mock('../lib/spawn-q', () => ({
  spawnQ: vi.fn()
}));

describe('CommandExecutor', () => {
  let mockSession: QSession;
  let mockCallbacks: any;
  let executor: CommandExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // QSessionのモック
    mockSession = {
      running: false,
      start: vi.fn(),
      send: vi.fn(),
      stop: vi.fn()
    } as any;

    // コールバックのモック
    mockCallbacks = {
      onModeChange: vi.fn(),
      onStatusChange: vi.fn(),
      onOutput: vi.fn(),
      onError: vi.fn()
    };

    executor = new CommandExecutor(mockSession, mockCallbacks);
  });

  describe('コマンド実行', () => {
    it('空のコマンドは無視される', async () => {
      // Act
      await executor.execute('');
      await executor.execute('  ');

      // Assert
      expect(mockCallbacks.onOutput).not.toHaveBeenCalled();
      expect(mockCallbacks.onStatusChange).not.toHaveBeenCalled();
    });

    it('チャットセッション開始コマンドを処理', async () => {
      // Arrange
      const command = 'q chat';

      // Act
      await executor.execute(command);

      // Assert
      expect(mockCallbacks.onModeChange).toHaveBeenCalledWith('session');
      expect(mockSession.start).toHaveBeenCalledWith('chat');
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it('翻訳セッション開始コマンドを処理', async () => {
      // Arrange
      const command = 'q translate';

      // Act
      await executor.execute(command);

      // Assert
      expect(mockCallbacks.onModeChange).toHaveBeenCalledWith('session');
      expect(mockSession.start).toHaveBeenCalledWith('translate');
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it('セッション中のコマンドはセッションに送信', async () => {
      // Arrange
      mockSession.running = true;
      const command = 'test message';

      // Act
      await executor.execute(command, 'session');

      // Assert
      expect(mockSession.send).toHaveBeenCalledWith(command);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it('通常のQコマンドを実行', async () => {
      // Arrange
      const command = 'q help';
      const mockResult = { 
        stdout: 'Help output\\nLine 2', 
        exitCode: 0 
      };
      (spawnQ as any).mockResolvedValue(mockResult);

      // Act
      await executor.execute(command, 'command');

      // Assert
      expect(spawnQ).toHaveBeenCalledWith(['help']);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(['Help output', 'Line 2']);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('ready');
    });

    it('コマンド実行エラーを処理', async () => {
      // Arrange
      const command = 'q invalid';
      const error = new Error('Command not found');
      (spawnQ as any).mockRejectedValue(error);

      // Act
      await executor.execute(command, 'command');

      // Assert
      expect(mockCallbacks.onError).toHaveBeenCalledWith(error.message);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('error');
    });

    it('実行中はstatusをrunningに設定', async () => {
      // Arrange
      const command = 'q help';
      let statusCalls: string[] = [];
      mockCallbacks.onStatusChange.mockImplementation((status: string) => {
        statusCalls.push(status);
      });
      
      (spawnQ as any).mockResolvedValue({ 
        stdout: 'output', 
        exitCode: 0 
      });

      // Act
      await executor.execute(command, 'command');

      // Assert
      expect(statusCalls[0]).toBe('running');
      expect(statusCalls[statusCalls.length - 1]).toBe('ready');
    });
  });
});
