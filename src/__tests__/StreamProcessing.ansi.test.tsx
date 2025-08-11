import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from '../components/App';
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
vi.mock('../lib/q-session.js', () => {
  const { EventEmitter } = require('events');
  
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
      const newSession = new MockQSession();
      globalMockSession = newSession;
      return newSession;
    })
  };
});

// Q CLI detectorのモック
vi.mock('../lib/q-cli-detector.js', () => ({
  detectQCLI: vi.fn().mockResolvedValue('/usr/local/bin/q')
}));

// spawnQのモック
vi.mock('../lib/spawn-q.js', () => ({
  spawnQ: vi.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0
  })
}));

describe('ANSIエスケープコード処理のテスト', () => {
  let mockSession: MockQSession;

  beforeEach(() => {
    vi.clearAllMocks();
    globalMockSession = null;
  });
  
  afterEach(async () => {
    if (globalMockSession) {
      globalMockSession.removeAllListeners();
      globalMockSession = null;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('Given: ANSIエスケープコードを含むデータ, When: データが受信される, Then: 生データが表示される', async () => {
    // Given
    const { lastFrame } = render(<App />);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    mockSession = globalMockSession;
    
    // When
    if (mockSession) {
      mockSession.emit('data', 'stdout', '\x1b[32mGreen Text\x1b[0m\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Then
    const output = lastFrame() || '';
    expect(output).toContain('Green Text');
  });

  it('Given: 256色ANSIコードを含むデータ, When: データが受信される, Then: 生データが表示される', async () => {
    // Given
    const { lastFrame } = render(<App />);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    mockSession = globalMockSession;
    
    // When
    if (mockSession) {
      mockSession.emit('data', 'stdout', '\x1b[38;5;12mColored Text\x1b[0m\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Then
    const output = lastFrame() || '';
    expect(output).toContain('Colored Text');
  });
});
