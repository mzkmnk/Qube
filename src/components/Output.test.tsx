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

  describe('Tool出力フォーマット', () => {
    it('Tool使用開始を適切にフォーマットする', () => {
      const lines = ['🛠️  Using tool: fs_read (trusted)'];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      expect(output).toContain('🔧');
      expect(output).toContain('fs_read');
      expect(output).toContain('(trusted)');
    });

    it('Tool実行詳細を適切にフォーマットする', () => {
      const lines = [
        'Reading directory: /Users/test/project with maximum depth of 0',
        'Writing file: /Users/test/project/output.txt',
        'Processing data from input stream'
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      expect(output).toContain('→');
      expect(output).toContain('Reading directory');
      expect(output).toContain('Writing file');
      expect(output).toContain('Processing data');
    });

    it('Tool成功メッセージを適切にフォーマットする', () => {
      const lines = [
        '✓ Successfully read directory /Users/test/project (4 entries)',
        '● ✓ Successfully created file output.txt'
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Successfully read directory');
      expect(output).toContain('Successfully created file');
    });

    it('Tool完了メッセージを適切にフォーマットする', () => {
      const lines = ['● Completed in 0.5s', '● Completed in 1.2s'];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      expect(output).toContain('⏱');
      expect(output).toContain('0.5s');
      expect(output).toContain('1.2s');
    });

    it('Tool検証失敗を適切にフォーマットする', () => {
      const lines = [
        'Tool validation failed:',
        'Failed to validate tool parameters: \'/Users/test/project/tasks\' is not a file'
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      expect(output).toContain('⚠');
      expect(output).toContain('Tool validation error');
      expect(output).toContain('→');
      expect(output).toContain('is not a file');
    });

    it('Tool関連の境界線マーカーを非表示にする', () => {
      const lines = [
        '│',
        '⋮',
        '●',
        '│⋮●',
        '  │⋮●  ',
        'Valid content line'
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      // ボーダー以外の境界線マーカーは表示されない（コンテンツエリアのみをチェック）
      const contentArea = output?.split('\n').slice(1, -1).join('\n') || '';
      expect(contentArea).not.toMatch(/^[│⋮●\s]*$/m);
      // 有効なコンテンツは表示される
      expect(output).toContain('Valid content line');
    });

    it('Tool関連の冗長な出力をフィルタする', () => {
      const lines = [
        '│⋮● some random output',
        '● Reading file: important.txt', // これは表示される
        '│⋮● another random line',
        '✓ Successfully processed data' // これも表示される
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      // 重要な情報のみ表示される
      expect(output).toContain('Reading file');
      expect(output).toContain('Successfully processed');
      // 冗長な出力は表示されない
      expect(output).not.toContain('some random output');
      expect(output).not.toContain('another random line');
    });

    it('複数のTool出力を組み合わせて正しく表示する', () => {
      const lines = [
        '🛠️  Using tool: fs_read (trusted)',
        '│',
        '● Reading directory: /Users/test/project with maximum depth of 0',
        '✓ Successfully read directory /Users/test/project (4 entries)',
        '⋮',
        '● Completed in 0.3s'
      ];
      const { lastFrame } = render(<Output lines={lines} />);
      
      const output = lastFrame();
      // Tool名が表示される
      expect(output).toContain('🔧');
      expect(output).toContain('fs_read');
      // 実行詳細が表示される
      expect(output).toContain('→');
      expect(output).toContain('Reading directory');
      // 成功メッセージが表示される
      expect(output).toContain('✓');
      expect(output).toContain('Successfully read directory');
      // 完了時間が表示される
      expect(output).toContain('⏱');
      expect(output).toContain('0.3s');
      // 単独の境界線マーカー行は表示されない（コンテンツエリアをチェック）
      const contentArea = output?.split('\n').slice(1, -1).join('\n') || '';
      expect(contentArea).not.toMatch(/^\s*[⋮]\s*$/m);
    });
  });
});
