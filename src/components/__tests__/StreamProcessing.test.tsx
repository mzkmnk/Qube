import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from '../App.js';
import { EventEmitter } from 'events';

// MockQSessionの型定義
interface MockQSession extends EventEmitter {
  running: boolean;
  start(type: string): Promise<void>;
  stop(): void;
  send(command: string): void;
}

// グローバルなモックセッションインスタンス
let globalMockSession: any = null;

// QSessionモジュールをモック
vi.mock('../../lib/q-session.js', () => {
  const { EventEmitter } = require('events');
  
  // MockQSessionクラスをvi.mockの中で定義
  class MockQSession extends EventEmitter {
    running = false;
    
    async start(type: string) {
      this.running = true;
      return Promise.resolve();
    }
    
    stop() {
      this.running = false;
    }
    
    send(command: string) {
      // メッセージ送信のシミュレーション
    }
  }
  
  return {
    QSession: vi.fn(() => {
      // 常に新しいインスタンスを作成し、グローバル変数に保存
      const newSession = new MockQSession();
      globalMockSession = newSession;
      return newSession;
    })
  };
});

// Q CLI detectorのモック
vi.mock('../../lib/q-cli-detector.js', () => ({
  detectQCLI: vi.fn().mockResolvedValue('/usr/local/bin/q')
}));

// spawnQのモック
vi.mock('../../lib/spawn-q.js', () => ({
  spawnQ: vi.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0
  })
}));

describe('Stream Processing Tests - その他のストリーミング処理のテスト', () => {
  let mockSession: MockQSession;

  beforeEach(() => {
    vi.clearAllMocks();
    // グローバルモックセッションをリセット
    if (globalMockSession) {
      globalMockSession.removeAllListeners();
    }
    globalMockSession = null;
  });
  
  afterEach(async () => {
    // 各テスト後にも確実にクリーンアップ
    if (globalMockSession) {
      globalMockSession.removeAllListeners();
      globalMockSession = null;
    }
    // すべての非同期処理が完了するのを待つ
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  describe('プログレス表示処理', () => {
    it('Given: スピナー文字を含むプログレス表示, When: キャリッジリターンで更新される, Then: 最新のプログレスのみ表示される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      // 他のテストと同じ初期化時間に統一
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // グローバルモックセッションを取得
      mockSession = globalMockSession;
      
      // When: プログレス表示をシミュレート
      if (mockSession) {
        mockSession.emit('data', 'stdout', '⠋ Loading...\r');
        await new Promise(resolve => setTimeout(resolve, 50));
        mockSession.emit('data', 'stdout', '⠙ Loading...\r');
        await new Promise(resolve => setTimeout(resolve, 50));
        mockSession.emit('data', 'stdout', '⠹ Loading...\n');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Then: 最新のプログレスのみ表示（出力内の出現は最大1つ）
      const output = lastFrame() || '';
      expect(output).toContain('Loading...');
      expect(output.match(/Loading\.\.\./g)?.length).toBeLessThanOrEqual(1);
    });

    it('Given: Thinking...メッセージ, When: 受信される, Then: フィルタリングされて表示されない', async () => {
      // Given
      const { lastFrame } = render(<App />);
      // 他のテストと同じ初期化時間に統一
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // グローバルモックセッションを取得
      mockSession = globalMockSession;
      
      // When
      if (mockSession) {
        mockSession.emit('data', 'stdout', 'Thinking...\n');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).not.toContain('Thinking...');
    });
  });

  describe('特殊文字の処理', () => {
    it('Given: MCPサーバー初期化メッセージ, When: 数字を含むメッセージが送信される, Then: 数字が正しく保持される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      // 他のテストと同じ初期化時間に統一
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // グローバルモックセッションを取得
      mockSession = globalMockSession;
      
      // When
      if (mockSession) {
        mockSession.emit('data', 'stdout', '0 of 1 mcp servers initialized.\n');
        mockSession.emit('data', 'stdout', '1 of 1 mcp servers initialized.\n');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('0 of 1 mcp servers initialized.');
      expect(output).toContain('1 of 1 mcp servers initialized.');
    });

    it('Given: モデル名を含むメッセージ, When: claude-3.7-sonnetが送信される, Then: 完全なモデル名が表示される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      // 他のテストと同じ初期化時間に統一
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // グローバルモックセッションを取得
      mockSession = globalMockSession;
      
      // When
      if (mockSession) {
        mockSession.emit('data', 'stdout', 'You are chatting with claude-3.7-sonnet\n');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('You are chatting with claude-3.7-sonnet');
    });
  });
});
