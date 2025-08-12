import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";

// QSessionのモック（他の依存より先に定義してモックを有効化）
vi.mock("../../lib/q-session", async () => {
  const { EventEmitter } = await import("node:events");
  class MockQSession extends EventEmitter {
    running = false;
    initialized = false;

    start(): void {
      this.running = true;
      setTimeout(() => {
        this.initialized = true;
        this.emit("initialized");
      }, 50);
    }

    stop(): void {
      this.running = false;
    }

    send(): void {}

    getInitializationBuffer(): string[] {
      return [];
    }
  }

  return {
    QSession: MockQSession,
  };
});

// clearTerminalのモック
vi.mock("../../lib/terminal", () => ({
  clearTerminal: vi.fn(),
}));

// detectQCLIのモック
vi.mock("../../lib/q-cli-detector", () => ({
  detectQCLI: vi.fn().mockResolvedValue("/usr/local/bin/q"),
}));

// figletのモック
vi.mock("figlet", () => {
  return {
    default: {
      text: (
        text: string,

        options: Record<string, unknown>,

        callback: (err: unknown, data?: string) => void,
      ) => {
        callback(null, "QUBE");
      },
    },
  };
});

// 依存のモックを定義した後にアプリとレンダラを読み込む
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../App";

describe("App 統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("アプリ起動時、QUBEロゴが表示される", async () => {
    const { lastFrame } = render(<App version="1.0.0" />);

    // figletの非同期処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // QUBEロゴが表示されている（ASCIIアートかテキスト）
    const frame = lastFrame();
    expect(frame).toContain("QUBE");
  });

  test("初期化完了後、'Waiting for output...'は表示されない", async () => {
    const { lastFrame } = render(<App version="1.0.0" />);

    // 初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    const frame = lastFrame();
    // Waiting for output...が表示されていないこと
    expect(frame).not.toContain("Waiting for output...");
  });

  test("ユーザー入力フィールドが常に表示される", () => {
    const { lastFrame } = render(<App version="1.0.0" />);

    const frame = lastFrame();
    // 初期化中のプレースホルダーが表示されている
    expect(frame).toMatch(/Initializing\.\.\.|Processing\.\.\./);
  });

  test("ヘッダーにバージョン情報が表示される", () => {
    const { lastFrame } = render(<App version="1.0.0" />);

    const frame = lastFrame();
    expect(frame).toContain("1.0.0");
  });

  test("ステータスバーが表示される", () => {
    const { lastFrame } = render(<App version="1.0.0" />);

    const frame = lastFrame();
    // ヘルプ情報が表示されている
    expect(frame).toMatch(/Ctrl\+C|Exit/i);
  });
});
