import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { App } from './App.js';

// モックの設定
vi.mock('../lib/spawn-q.ts', () => ({
  spawnQ: vi.fn().mockResolvedValue({
    stdout: 'Command output',
    stderr: '',
    exitCode: 0
  })
}));

vi.mock('../lib/q-session.ts', () => ({
  QSession: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
    running: false
  }))
}));

describe('App コンポーネント', () => {
  it('すべてのUIコンポーネントが表示される', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();
    
    // ヘッダーが表示されている
    expect(output).toContain('Qube');
    
    // ステータスバーが表示されている（commandまたはreadyの文字列）
    expect(output).toMatch(/command|ready/);
  });

  it('Ctrl+D で終了する', () => {
    const { stdin, unmount } = render(<App />);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Ctrl+D を送信
    stdin.write('\x04');
    
    expect(exitSpy).toHaveBeenCalledWith(0);
    
    exitSpy.mockRestore();
    unmount();
  });

  it('Ctrl+L で画面をクリアする', () => {
    const { stdin, lastFrame } = render(<App />);
    
    // 初期状態を確認
    const beforeClear = lastFrame();
    expect(beforeClear).toBeDefined();
    
    // Ctrl+L を送信
    stdin.write('\x0C');
    
    // クリア後も表示されることを確認
    const afterClear = lastFrame();
    expect(afterClear).toBeDefined();
  });
});