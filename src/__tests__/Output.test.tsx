import React from "react";
import { render } from "ink-testing-library";
import { test, expect, describe } from "vitest";
import { Output } from "../components/Output";

describe("Output コンポーネント", () => {
  test("出力がない場合、Waiting for output...を表示しない（空白表示）", () => {
    const { lastFrame } = render(<Output lines={[]} showPlaceholder={false} />);

    // 初期化完了後はWaiting for output...を表示しない
    expect(lastFrame()).not.toContain("Waiting for output...");
    expect(lastFrame()).toBe("");
  });

  test("出力がある場合、正しく表示する", () => {
    const lines = ["Hello, World!", "テスト出力"];
    const { lastFrame } = render(<Output lines={lines} />);

    expect(lastFrame()).toContain("Hello, World!");
    expect(lastFrame()).toContain("テスト出力");
  });

  test("ユーザー入力は枠組み付きで表示する", () => {
    const lines = ["USER_INPUT:質問があります"];
    const { lastFrame } = render(<Output lines={lines} />);

    expect(lastFrame()).toContain("▶ 質問があります");
    expect(lastFrame()).toContain("┌");
    expect(lastFrame()).toContain("└");
  });

  test("高さ制限がある場合、最新の行を優先表示", () => {
    const lines = ["行1", "行2", "行3", "行4", "行5"];
    const { lastFrame } = render(<Output lines={lines} height={3} />);

    expect(lastFrame()).not.toContain("行1");
    expect(lastFrame()).not.toContain("行2");
    expect(lastFrame()).toContain("行3");
    expect(lastFrame()).toContain("行4");
    expect(lastFrame()).toContain("行5");
  });

  test("Thinking...メッセージは特別な表示（スクランブル）", () => {
    const lines = ["Thinking..."];
    const { lastFrame } = render(<Output lines={lines} />);

    // スクランブル表示されるため、実際の表示内容は変化する
    // ただし、何らかの文字が表示されることを確認
    expect(lastFrame()).not.toBe("");
  });
});
