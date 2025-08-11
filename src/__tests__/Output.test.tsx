import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Output } from '../components/Output.js';

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

    // Waiting for output... が表示される
    expect(lastFrame()).toContain('Waiting for output...');
  });

  it('高さが指定されている場合、その高さで表示される', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'];
    const { lastFrame } = render(<Output lines={lines} height={3} />);

    const output = lastFrame();
    expect(output).toBeDefined();
    // The number of lines should be constrained by the height.
    // We expect 3 lines of content + borders.
    // Note: This is an inexact check.
    expect(output?.split('\n').length).toBeLessThanOrEqual(5); // 3 for content + 2 for borders
  });

  // scrollOffset は廃止（YAGNI）

  it('ANSIカラーコードを含む行をそのまま表示する', () => {
    const lines = ['\u001b[32mGreen text\u001b[0m'];
    const { lastFrame } = render(<Output lines={lines} />);

    const output = lastFrame();
    expect(output).toContain('Green text');
  });
});
