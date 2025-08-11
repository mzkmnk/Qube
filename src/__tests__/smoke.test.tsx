import React from "react";
import { render } from "ink-testing-library";
import { Text } from "ink";
import { describe, it, expect } from "vitest";

// TDDサイクル Red -> Green -> Refactor の実践
// Step 2: Green - テストを通す最小限の実装

// テストを通すための最小限のコンポーネント実装
const HelloComponent: React.FC = () => {
  return <Text>Hello</Text>;
};

describe("Inkコンポーネントのスモークテスト", () => {
  it("「Hello」テキストを表示する", () => {
    // コンポーネントをレンダリング
    const { lastFrame } = render(<HelloComponent />);

    // 「Hello」というテキストが含まれることを期待
    expect(lastFrame()).toContain("Hello");
  });
});
