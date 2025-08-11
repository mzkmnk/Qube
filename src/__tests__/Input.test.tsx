import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../components/Input.js';

describe('Input コンポーネント', () => {
  it('プロンプトと入力値を表示する', () => {
    const { lastFrame } = render(<Input value="test command" onChange={() => {}} onSubmit={() => {}} />);
    
    // 実際のプロンプト記号は「▶」
    expect(lastFrame()).toContain('▶');
    expect(lastFrame()).toContain('test command');
  });

  it('プレースホルダーを表示する', () => {
    const { lastFrame } = render(<Input value="" placeholder="Enter command..." onChange={() => {}} onSubmit={() => {}} />);
    
    expect(lastFrame()).toContain('Enter command...');
  });

  it('入力変更時にonChangeコールバックが呼ばれる', () => {
    const onChange = vi.fn();
    const { stdin } = render(<Input value="" onChange={onChange} onSubmit={() => {}} />);
    
    // 文字入力をシミュレート
    stdin.write('a');
    
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('Enterキー押下時にonSubmitコールバックが呼ばれる', () => {
    const onSubmit = vi.fn();
    const { stdin } = render(<Input value="test" onChange={() => {}} onSubmit={onSubmit} />);
    
    // Enterキーをシミュレート
    stdin.write('\r');
    
    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('無効化されている場合、入力を受け付けない', () => {
    const onChange = vi.fn();
    const { stdin, lastFrame } = render(<Input value="" disabled={true} onChange={onChange} onSubmit={() => {}} />);
    
    stdin.write('a');
    
    expect(onChange).not.toHaveBeenCalled();
    // 無効化時の見た目を確認（グレーアウトなど）
    expect(lastFrame()).toBeDefined();
  });
});
