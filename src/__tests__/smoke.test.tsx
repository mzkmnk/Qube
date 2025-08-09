import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';

// TDDサイクル Red -> Green -> Refactor の実践
// Step 1: Red - 失敗するテストを書く

describe('Inkコンポーネントのスモークテスト', () => {
  it('「Hello」テキストを表示する', () => {
    // まだ存在しないコンポーネントをテスト
    const { lastFrame } = render(<HelloComponent />);
    
    // 「Hello」というテキストが含まれることを期待
    expect(lastFrame()).toContain('Hello');
  });
});

// HelloComponent はまだ定義されていないため、このテストは失敗する