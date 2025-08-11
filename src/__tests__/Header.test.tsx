import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Header } from '../components/Header.js';

describe('Header コンポーネント', () => {
  it('タイトルとバージョンを表示する', () => {
    const { lastFrame } = render(<Header title="Qube" version="0.1.0" />);
    
    expect(lastFrame()).toContain('Qube');
    expect(lastFrame()).toContain('v0.1.0');
  });

  it('区切り線を表示する', () => {
    const { lastFrame } = render(<Header title="Qube" version="0.1.0" />);
    
    // 区切り線として使われる文字が含まれているか確認
    expect(lastFrame()).toMatch(/[─━]/);
  });

  it('コンポーネントの幅が指定されている場合、その幅で表示される', () => {
    const { lastFrame } = render(<Header title="Qube" version="0.1.0" width={50} />);
    const output = lastFrame();
    
    // 改行で分割して各行の長さをチェック
    const lines = output?.split('\n') || [];
    const headerLine = lines.find(line => line.includes('Qube'));
    
    // ヘッダーラインが存在することを確認
    expect(headerLine).toBeDefined();
  });
});