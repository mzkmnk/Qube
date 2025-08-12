import React from "react";
import { render } from "ink-testing-library";
import { describe, it, expect } from "vitest";
import { StatusBar } from "../components/StatusBar";

describe("StatusBar コンポーネント", () => {
  it("ステータス情報を表示する", () => {
    const { lastFrame } = render(<StatusBar mode="command" status="ready" />);

    // mode="command"の場合、"Cmd"と表示される
    expect(lastFrame()).toContain("Cmd");
    // status="ready"の場合、●アイコンが表示される
    expect(lastFrame()).toContain("●");
  });

  it("実行中のステータスを表示する", () => {
    const { lastFrame } = render(<StatusBar mode="session" status="running" />);

    // mode="session"の場合、"Chat"と表示される
    expect(lastFrame()).toContain("Chat");
    // status="running"の場合、◌アイコンが表示される
    expect(lastFrame()).toContain("◌");
  });

  it("エラー数を表示する", () => {
    const { lastFrame } = render(
      <StatusBar mode="command" status="ready" errorCount={3} />,
    );

    expect(lastFrame()).toContain("[3]");
  });

  it("処理中のコマンドを表示する", () => {
    const { lastFrame } = render(
      <StatusBar mode="command" status="running" currentCommand="q chat" />,
    );

    expect(lastFrame()).toContain("q chat");
  });

  it("キーバインドのヒントを表示する", () => {
    const { lastFrame } = render(
      <StatusBar mode="command" status="ready" showHelp={true} />,
    );

    // 実際の表示形式は "^C Exit  ↑↓ History"
    expect(lastFrame()).toContain("^C Exit");
    expect(lastFrame()).toContain("↑↓ History");
  });
});
