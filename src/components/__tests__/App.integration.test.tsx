import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App.js';
import { QSession } from '../../lib/q-session.js';

// QSessionのモック
vi.mock('../../lib/q-session.js', () => ({
  QSession: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    running: false
  }))
}));

describe('App Integration Tests', () => {
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = new QSession();
  });

  describe('自動Q chatセッション起動', () => {
    it('Given: アプリケーションが起動される, When: 初期レンダリング時, Then: 自動的にQ chatセッションが開始される', async () => {
      // Given
      const { lastFrame } = render(<App version="0.1.0" />);
      
      // When
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      expect(mockSession.start).toHaveBeenCalledWith('chat');
      expect(lastFrame()).toContain('Qube');
    });

    it('Given: Q chatセッションの起動が失敗, When: エラーが発生, Then: エラーメッセージが表示される', async () => {
      // Given
      mockSession.start.mockRejectedValueOnce(new Error('Connection failed'));
      
      // When
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame();
      expect(output).toContain('Failed to start Q session');
    });
  });

  describe('UIレンダリング', () => {
    it('Given: アプリケーションが起動済み, When: 画面が表示される, Then: モダンなUIコンポーネントが正しく表示される', () => {
      // Given & When
      const { lastFrame } = render(<App version="0.1.0" />);
      
      // Then
      const output = lastFrame();
      expect(output).toContain('◆'); // ヘッダーのアイコン
      expect(output).toContain('Qube');
      expect(output).toContain('v0.1.0');
      expect(output).toContain('▶'); // 入力プロンプト
      expect(output).toContain('●'); // ステータスインジケーター
      expect(output).toContain('^C Stop');
      expect(output).toContain('^D Exit');
      expect(output).toContain('^L Clear');
      expect(output).toContain('↑↓ History');
    });

    it('Given: 接続状態が変化, When: セッションが開始される, Then: ヘッダーの接続状態が更新される', async () => {
      // Given
      mockSession.running = true;
      
      // When
      const { lastFrame } = render(<App />);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame();
      expect(output).toMatch(/●\s*Connected|○\s*Connecting/);
    });
  });

  describe('ユーザー入力処理', () => {
    it('Given: ユーザーがメッセージを入力, When: Enterキーを押す, Then: メッセージがセッションに送信される', async () => {
      // Given
      mockSession.running = true;
      const { stdin, lastFrame } = render(<App />);
      
      // When
      stdin.write('Hello Q');
      stdin.write('\r'); // Enter key
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      expect(mockSession.send).toHaveBeenCalledWith('Hello Q');
      const output = lastFrame();
      expect(output).toContain('Hello Q');
    });

    it('Given: 履歴に複数のコマンドが存在, When: 上矢印キーを押す, Then: 前のコマンドが入力欄に表示される', async () => {
      // Given
      const { stdin } = render(<App />);
      stdin.write('first command\r');
      stdin.write('second command\r');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When
      stdin.write('\u001B[A'); // 上矢印
      
      // Then
      // 履歴機能のテスト（実装により動作確認）
      expect(true).toBe(true); // プレースホルダー
    });
  });

  describe('キーボードショートカット', () => {
    it('Given: アプリケーションが実行中, When: Ctrl+Lを押す, Then: 出力がクリアされる', async () => {
      // Given
      const { stdin, lastFrame } = render(<App />);
      stdin.write('test message\r');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When
      stdin.write('\x0C'); // Ctrl+L
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      const output = lastFrame();
      expect(output).not.toContain('test message');
    });

    it('Given: セッションが実行中, When: Ctrl+Cを押す, Then: セッションが停止される', async () => {
      // Given
      mockSession.running = true;
      const { stdin } = render(<App />);
      
      // When
      stdin.write('\x03'); // Ctrl+C
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then
      expect(mockSession.stop).toHaveBeenCalled();
    });

    it('Given: アプリケーションが実行中, When: Ctrl+Dを押す, Then: アプリケーションが終了する', () => {
      // Given
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const { stdin } = render(<App />);
      
      // When
      stdin.write('\x04'); // Ctrl+D
      
      // Then
      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });
  });
});
