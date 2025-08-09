import React from 'react';
import { render } from 'ink-testing-library';
import { Input } from '../Input.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Input component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('Ctrl+L を押しても l 文字が入力されない', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    
    const { stdin } = render(
      <Input 
        prompt=">"
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    
    // Ctrl+L を押す（\x0C は Ctrl+L のコード）
    await stdin.write('\x0C');
    
    // タイマーを進める（ControlledTextInput のタイムアウト処理のため）
    vi.advanceTimersByTime(100);
    
    // onChange が呼ばれていないか、'l' で呼ばれていないことを確認
    if (onChange.mock.calls.length > 0) {
      // もし呼ばれていても、'l' 単体ではないことを確認
      expect(onChange).not.toHaveBeenCalledWith('l');
    }
  });
  
  it('通常の文字入力は正常に動作する', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    
    const { stdin } = render(
      <Input 
        prompt=">"
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    
    // 通常の文字を個別に入力
    await stdin.write('h');
    await stdin.write('e');
    await stdin.write('l');
    await stdin.write('l');
    await stdin.write('o');
    
    // onChange が呼ばれることを確認（ink-text-input の挙動により回数は異なる可能性）
    expect(onChange).toHaveBeenCalled();
  });
  
  it('Enter キーで onSubmit が呼ばれる', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const testValue = 'test command';
    
    const { stdin } = render(
      <Input 
        prompt=">"
        value={testValue}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    
    // Enter を押す
    await stdin.write('\r');
    
    // onSubmit が正しい値で呼ばれることを確認
    expect(onSubmit).toHaveBeenCalledWith(testValue);
  });
});