import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App.js';
import { EventEmitter } from 'events';

// QSessionのモッククラス
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

// QSessionモジュールをモック
vi.mock('../../lib/q-session.js', () => {
  const session = new MockQSession();
  return {
    QSession: vi.fn(() => session)
  };
});

describe('Stream Processing Tests - ストリーミング処理のテスト', () => {
  let mockSession: MockQSession;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ANSIエスケープコード処理', () => {
    it('Given: ANSIエスケープコードを含むデータ, When: データが受信される, Then: エスケープコードが除去されて表示される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // モックセッションインスタンスを取得
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When: ANSIエスケープコードを含むデータを送信
      mockSession.emit('data', 'stdout', '\x1b[32mGreen Text\x1b[0m');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('Green Text');
      expect(output).not.toContain('\x1b[32m');
      expect(output).not.toContain('\x1b[0m');
    });

    it('Given: 256色ANSIコードを含むデータ, When: データが受信される, Then: すべての色コードが除去される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When
      mockSession.emit('data', 'stdout', '38;5;12mColored Text');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('Colored Text');
      expect(output).not.toContain('38;5;12m');
    });
  });

  describe('メッセージバッファリング', () => {
    it('Given: 不完全な文章, When: データがストリーミングで送信される, Then: 文章が完成するまでバッファリングされる', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When: 文章を分割して送信
      mockSession.emit('data', 'stdout', 'Welcome to ');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 文章が不完全な段階では表示されない
      let output = lastFrame() || '';
      expect(output).not.toContain('Welcome to');
      
      // 文章の続きを送信
      mockSession.emit('data', 'stdout', 'Amazon Q!');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then: 完全な文章が表示される
      output = lastFrame() || '';
      expect(output).toContain('Welcome to Amazon Q!');
    });

    it('Given: 改行を含むデータ, When: データが送信される, Then: 改行ごとに行が分割される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When
      mockSession.emit('data', 'stdout', 'Line 1\nLine 2\nLine 3\n');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });
  });

  describe('プログレス表示処理', () => {
    it('Given: スピナー文字を含むプログレス表示, When: キャリッジリターンで更新される, Then: 最新のプログレスのみ表示される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When: プログレス表示をシミュレート
      mockSession.emit('data', 'stdout', '⠋ Loading...\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      mockSession.emit('data', 'stdout', '⠙ Loading...\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      mockSession.emit('data', 'stdout', '⠹ Loading...\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then: 最新のプログレスのみ表示
      const output = lastFrame() || '';
      expect(output).toContain('Loading...');
      expect(output.match(/Loading\.\.\./g)?.length).toBeLessThanOrEqual(1);
    });

    it('Given: Thinking...メッセージ, When: 受信される, Then: フィルタリングされて表示されない', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When
      mockSession.emit('data', 'stdout', 'Thinking...\n');
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
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When
      mockSession.emit('data', 'stdout', '0 of 1 mcp servers initialized.\n');
      mockSession.emit('data', 'stdout', '1 of 1 mcp servers initialized.\n');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('0 of 1 mcp servers initialized.');
      expect(output).toContain('1 of 1 mcp servers initialized.');
    });

    it('Given: モデル名を含むメッセージ, When: claude-3.7-sonnetが送信される, Then: 完全なモデル名が表示される', async () => {
      // Given
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { QSession } = await vi.importMock('../../lib/q-session.js') as any;
      mockSession = new QSession();
      
      // When
      mockSession.emit('data', 'stdout', 'You are chatting with claude-3.7-sonnet');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame() || '';
      expect(output).toContain('You are chatting with claude-3.7-sonnet');
    });
  });
});
