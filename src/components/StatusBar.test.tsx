import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { StatusBar } from './StatusBar.js';

describe('StatusBar コンポーネント', () => {
  it('ステータス情報を表示する', () => {
    const { lastFrame } = render(<StatusBar mode="command" status="ready" />);
    
    expect(lastFrame()).toContain('command');
    expect(lastFrame()).toContain('ready');
  });

  it('実行中のステータスを表示する', () => {
    const { lastFrame } = render(<StatusBar mode="session" status="running" />);
    
    expect(lastFrame()).toContain('session');
    expect(lastFrame()).toContain('running');
  });

  it('エラー数を表示する', () => {
    const { lastFrame } = render(<StatusBar mode="command" status="ready" errorCount={3} />);
    
    expect(lastFrame()).toContain('3');
  });

  it('処理中のコマンドを表示する', () => {
    const { lastFrame } = render(<StatusBar mode="command" status="running" currentCommand="q chat" />);
    
    expect(lastFrame()).toContain('q chat');
  });

  it('キーバインドのヒントを表示する', () => {
    const { lastFrame } = render(<StatusBar mode="command" status="ready" showHelp={true} />);
    
    // よく使うキーバインドのヒントが含まれているか
    expect(lastFrame()).toMatch(/Ctrl\+C|Ctrl\+D|Ctrl\+L/);
  });
});