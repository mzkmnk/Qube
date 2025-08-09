import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EnhancedOutput } from './EnhancedOutput.js';
import { ProcessedLine } from '../lib/stream-processor.js';

describe('EnhancedOutput', () => {
  /**
   * テスト用のProcessedLineを作成
   */
  function createLine(text: string, type: ProcessedLine['type'] = 'normal'): ProcessedLine {
    return {
      raw: text,
      text,
      type
    };
  }
  
  it('処理済みの行を表示できる', () => {
    const lines: ProcessedLine[] = [
      createLine('Line 1'),
      createLine('Line 2'),
      createLine('Line 3')
    ];
    
    const { lastFrame } = render(
      <EnhancedOutput lines={lines} />
    );
    
    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
  });
  
  it('高さ制限がある場合、指定行数のみ表示する', () => {
    const lines: ProcessedLine[] = [
      createLine('Line 1'),
      createLine('Line 2'),
      createLine('Line 3'),
      createLine('Line 4'),
      createLine('Line 5')
    ];
    
    const { lastFrame } = render(
      <EnhancedOutput lines={lines} height={3} />
    );
    
    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
    expect(lastFrame()).not.toContain('Line 4');
    expect(lastFrame()).not.toContain('Line 5');
  });
  
  it('スクロールオフセットが適用される', () => {
    const lines: ProcessedLine[] = [
      createLine('Line 1'),
      createLine('Line 2'),
      createLine('Line 3'),
      createLine('Line 4'),
      createLine('Line 5')
    ];
    
    const { lastFrame } = render(
      <EnhancedOutput lines={lines} height={3} scrollOffset={2} />
    );
    
    expect(lastFrame()).not.toContain('Line 1');
    expect(lastFrame()).not.toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
    expect(lastFrame()).toContain('Line 4');
    expect(lastFrame()).toContain('Line 5');
  });
  
  it('処理中の場合スピナーが表示される', () => {
    const lines: ProcessedLine[] = [
      createLine('Line 1')
    ];
    
    const { lastFrame } = render(
      <EnhancedOutput lines={lines} isProcessing={true} />
    );
    
    expect(lastFrame()).toContain('Processing...');
  });
  
  it('カスタム処理メッセージを表示できる', () => {
    const lines: ProcessedLine[] = [];
    
    const { lastFrame } = render(
      <EnhancedOutput
        lines={lines}
        isProcessing={true}
        processingMessage="Q CLIを実行中..."
      />
    );
    
    expect(lastFrame()).toContain('Q CLIを実行中...');
  });
  
  it('異なるタイプの行が正しく表示される', () => {
    const lines: ProcessedLine[] = [
      createLine('Normal text', 'normal'),
      createLine('\x1b[31mError message\x1b[0m', 'error'),
      createLine('\x1b[33mWarning message\x1b[0m', 'warning'),
      {
        raw: '{"formatted":"json"}',
        text: '{\n  "formatted": "json"\n}',
        type: 'json',
        json: { formatted: 'json' }
      }
    ];
    
    const { lastFrame } = render(
      <EnhancedOutput lines={lines} />
    );
    
    const output = lastFrame();
    expect(output).toContain('Normal text');
    expect(output).toContain('Error message');
    expect(output).toContain('Warning message');
    expect(output).toContain('"formatted": "json"');
  });
});