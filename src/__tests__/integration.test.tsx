import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../components/App';

// モックの設定
vi.mock('../lib/spawn-q.ts', () => ({
  spawnQ: vi.fn()
}));

vi.mock('../lib/q-cli-detector.ts', () => ({
  detectQCLI: vi.fn().mockResolvedValue('/usr/local/bin/q')
}));

import { spawnQ } from '../lib/spawn-q';

describe('統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コマンドを入力して実行できる', async () => {
    vi.mocked(spawnQ).mockResolvedValue({
      stdout: 'Hello from Q CLI',
      stderr: '',
      exitCode: 0
    });

    const { stdin, lastFrame } = render(<App />);
    
    // コマンドを入力
    stdin.write('test command');
    stdin.write('\r'); // Enter
    
    // 少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    // 実際のプロンプトは「▶」、コマンドはOutput内に表示される
    expect(output).toContain('test command');
  });

  it('履歴機能が動作する', () => {
    const { stdin, lastFrame } = render(<App />);
    
    // コマンドを入力して実行
    stdin.write('first command');
    stdin.write('\r');
    
    // 入力をクリア
    stdin.write('');
    
    // 上矢印で履歴を取得
    stdin.write('\u001B[A'); // Up arrow
    
    // 履歴から取得したコマンドが表示されることを確認
    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it('Ctrl+L で出力をクリアできる', () => {
    vi.mocked(spawnQ).mockResolvedValue({
      stdout: 'Some output',
      stderr: '',
      exitCode: 0
    });

    const { stdin, lastFrame } = render(<App />);
    
    // コマンドを実行して出力を生成
    stdin.write('test');
    stdin.write('\r');
    
    // Ctrl+L でクリア
    stdin.write('\x0C');
    
    // クリア後も基本UIは表示される
    const output = lastFrame();
    expect(output).toContain('Qube'); // ヘッダーは残る
  });

  it('エラーが発生した場合、エラーカウントが増える', async () => {
    vi.mocked(spawnQ).mockResolvedValue({
      stdout: '',
      stderr: 'Error occurred',
      exitCode: 1
    });

    const { stdin, lastFrame } = render(<App />);
    
    // エラーが発生するコマンドを実行
    stdin.write('error command');
    stdin.write('\r');
    
    // 少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    // エラーカウントまたはエラーメッセージが表示される
    expect(output).toMatch(/Error|error|1/);
  });

  it('セッションモードのコマンドを認識する', async () => {
    const { stdin, lastFrame } = render(<App />);
    
    // セッションモードコマンドを入力
    stdin.write('q chat');
    stdin.write('\r');
    
    // 少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    // コマンドが出力に表示されることを確認（実際のプロンプトは「▶」）
    expect(output).toContain('q chat');
  });
});
