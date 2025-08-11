import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { formatLine } from './LineFormatter.js';
import { setTimeout } from 'timers/promises';

// Helper function to render a single formatted line and get the output
const renderLine = async (line: string, isInCodeBlock = false) => {
  const formatted = formatLine(line, isInCodeBlock);
  if (formatted === null || formatted === 'DIFF_LINE') {
    return '';
  }
  const { lastFrame, unmount } = render(React.createElement(React.Fragment, null, formatted));
  // Give Ink time to render.
  await setTimeout(50);
  const output = lastFrame();
  unmount();
  return output;
};

describe('LineFormatter', () => {
  describe('Tool出力フォーマット', () => {
    it('Tool使用開始を適切にフォーマットする', async () => {
      const output = await renderLine('🛠️  Using tool: fs_read (trusted)');
      expect(output).toContain('🔧');
      expect(output).toContain('fs_read');
      expect(output).toContain('(trusted)');
    });

    it('Tool実行詳細を適切にフォーマットする', async () => {
      const output = await renderLine('Reading directory: /Users/test/project');
      expect(output).toContain('→');
      expect(output).toContain('Reading directory');
    });

    it('Tool成功メッセージを適切にフォーマットする', async () => {
      const output = await renderLine('✓ Successfully read directory /Users/test/project');
      expect(output).toContain('✓');
      expect(output).toContain('Successfully read directory');
    });

    it('Tool完了メッセージを適切にフォーマットする', async () => {
      const output = await renderLine('● Completed in 0.5s');
      expect(output).toContain('⏱');
      expect(output).toContain('0.5s');
    });

    it('Tool検証失敗を適切にフォーマットする', async () => {
      const output = await renderLine('Tool validation failed:');
      expect(output).toContain('⚠');
      expect(output).toContain('Tool validation error');
    });

    it('Tool関連の境界線マーカーを非表示にする', () => {
      expect(formatLine('│')).toBe(null);
      expect(formatLine('⋮')).toBe(null);
      expect(formatLine('●')).toBe(null);
    });

    it('Tool関連の冗長な出力をフィルタする', () => {
       expect(formatLine('│⋮● some random output')).toBe(null);
    });
  });

  describe('Amazon Q CLI 確認メッセージ', () => {
    it('ANSIエスケープシーケンスを含む確認メッセージを美しくフォーマットする', async () => {
      const output = await renderLine('[?25h Allow this action? Use \'t\' to trust (always allow) this tool for the session. [y/n/t]:');
      expect(output).toContain('🔐 Amazon Q - Permission Required');
      expect(output).toContain('Allow this action?');
      expect(output).toContain('[y]');
      expect(output).not.toContain('[?25h');
    });
  });

  describe('Markdown フォーマット', () => {
    it('ヘッダーを適切にフォーマットする', async () => {
      const output = await renderLine('# H1 ヘッダー');
      expect(output).toContain('H1 ヘッダー');
    });

    it('太字テキストをフォーマットする', async () => {
      const output = await renderLine('これは **太字** のテストです');
      expect(output).toContain('太字');
    });

    it('イタリックテキストをフォーマットする', async () => {
      const output = await renderLine('これは *イタリック* のテストです');
      expect(output).toContain('イタリック');
    });

    it('インラインコードをフォーマットする', async () => {
      const output = await renderLine('これは `インラインコード` のテストです');
      expect(output).toContain('インラインコード');
    });

    it('コードブロックの開始を美しくフォーマットする', async () => {
      const output = await renderLine('```typescript');
      expect(output).toContain('typescript');
    });

    it('リストを適切にフォーマットする', async () => {
      const output = await renderLine('- アイテム1');
      expect(output).toContain('アイテム1');
    });

    it('番号付きリストをフォーマットする', async () => {
      const output = await renderLine('1. 第一項目');
      expect(output).toContain('第一項目');
    });

    it('引用をフォーマットする', async () => {
      const output = await renderLine('> これは引用です');
      expect(output).toContain('これは引用です');
    });

    it('水平線を表示する', async () => {
      const output = await renderLine('---');
      expect(output).toBeDefined();
      expect(output?.length || 0).toBeGreaterThan(0);
    });

    it('リンクをフォーマットする', async () => {
      const output = await renderLine('[GitHub](https://github.com)');
      expect(output).toContain('GitHub');
    });

    it('コードブロック内のコンテンツに背景色を適用する', async () => {
      const output = await renderLine('const hello = "world";', true);
      expect(output).toContain('const hello');
    });

    it('プログラムコードっぽい行を自動検出して背景色を適用する', async () => {
      const output = await renderLine('import React from "react";');
      expect(output).toContain('import React');
    });
  });

  describe('Diff Line Detection', () => {
    it('should identify diff lines', () => {
        expect(formatLine('  1,  1: import React from "react";')).toBe('DIFF_LINE');
        expect(formatLine('•   2 : import { Box, Text } from "ink";')).toBe('DIFF_LINE');
        expect(formatLine('+   3: import { Another } from "somewhere";')).toBe('DIFF_LINE');
        expect(formatLine('-   4 : import { Old } from "old";')).toBe('DIFF_LINE');
    });
  });
});
