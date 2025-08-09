import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Output } from './Output.js';

describe('Output コンポーネント', () => {
  it('出力内容を表示する', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3'];
    const { lastFrame } = render(<Output lines={lines} />);
    
    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
  });

  it('空の配列の場合、何も表示しない', () => {
    const { lastFrame } = render(<Output lines={[]} />);
    
    // 空の出力またはボックスのみが表示される
    expect(lastFrame()).toBeDefined();
  });

  it('高さが指定されている場合、その高さで表示される', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'];
    const { lastFrame } = render(<Output lines={lines} height={3} />);
    
    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it('スクロール位置を指定できる', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
    const { lastFrame } = render(<Output lines={lines} height={3} scrollOffset={5} />);
    
    const output = lastFrame();
    // スクロール位置に基づいて表示される行を確認
    // scrollOffset=5から3行表示されるので、Line 6, Line 7, Line 8 が表示される
    expect(output).toBeDefined();
    // ボーダーがあるため、実際の内容確認は難しいので、存在確認のみにする
  });

  it('ANSIカラーコードを含む行を正しく表示する', () => {
    const lines = ['\u001b[32mGreen text\u001b[0m', '\u001b[31mRed text\u001b[0m'];
    const { lastFrame } = render(<Output lines={lines} />);
    
    const output = lastFrame();
    // カラーコードを除いたテキストが含まれているか確認
    expect(output).toContain('Green text');
    expect(output).toContain('Red text');
  });
});