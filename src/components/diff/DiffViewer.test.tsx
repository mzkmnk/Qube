import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { DiffViewer } from './DiffViewer.js';

describe('DiffViewer', () => {
  it('should render nothing for empty diff lines', () => {
    const { lastFrame } = render(<DiffViewer diffLines={[]} />);
    expect(lastFrame()).toBe('');
  });

  it('should render unchanged lines correctly', () => {
    const diffLines = ['  1,  1: const a = 1;'];
    const { lastFrame } = render(<DiffViewer diffLines={diffLines} />);
    const output = lastFrame();
    expect(output).toContain('const a = 1;');
    // It should appear in both left and right panes
    expect(output.match(/const a = 1;/g) || []).toHaveLength(2);
  });

  it('should render added lines correctly', () => {
    const diffLines = ['+   2: const b = 2;'];
    const { lastFrame } = render(<DiffViewer diffLines={diffLines} />);
    const output = lastFrame();
    expect(output).toContain('const b = 2;');
    // It should only appear in the right (green) pane
    expect(output.match(/const b = 2;/g) || []).toHaveLength(1);
  });

  it('should render removed lines correctly', () => {
    const diffLines = ['•   3 : const c = 3;'];
    const { lastFrame } = render(<DiffViewer diffLines={diffLines} />);
    const output = lastFrame();
    expect(output).toContain('const c = 3;');
    // It should only appear in the left (red) pane
    expect(output.match(/const c = 3;/g) || []).toHaveLength(1);
  });

  it('should render a combination of changes correctly', () => {
    const diffLines = [
      '  1,  1: line 1',
      '•   2 : line 2 old',
      '+   2: line 2 new',
      '  3,  3: line 3',
    ];
    const { lastFrame } = render(<DiffViewer diffLines={diffLines} />);
    const output = lastFrame();

    expect(output).toContain('line 1');
    expect(output.match(/line 1/g) || []).toHaveLength(2);

    expect(output).toContain('line 2 old');
    expect(output).toContain('line 2 new');

    expect(output).toContain('line 3');
    expect(output.match(/line 3/g) || []).toHaveLength(2);
  });
});
