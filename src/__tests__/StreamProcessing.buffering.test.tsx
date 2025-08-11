import React from "react";
import { render } from "ink-testing-library";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "events";

// MockQSessionの型定義
interface MockQSession extends EventEmitter {
  running: boolean;
  start(type: string): Promise<void>;
  stop(): void;
  send(command: string): void;
}

// グローバルなモックセッションインスタンス
let globalMockSession: MockQSession | null = null;

// QSessionモジュールをモック
vi.doMock("../lib/q-session", () => {
  class MockQSession extends EventEmitter {
    running = false;

    async start(_type: string) {
      this.running = true;
      return Promise.resolve();
    }

    stop() {
      this.running = false;
    }

    send(_command: string) {
      // メッセージ送信のシミュレーション
    }
  }

  return {
    QSession: vi.fn(() => {
      const newSession = new MockQSession();
      globalMockSession = newSession;
      return newSession;
    }),
  };
});

// Q CLI detectorのモック
vi.mock("../lib/q-cli-detector", () => ({
  detectQCLI: vi.fn().mockResolvedValue("/usr/local/bin/q"),
}));

// spawnQのモック
vi.mock("../lib/spawn-q", () => ({
  spawnQ: vi.fn().mockResolvedValue({
    stdout: "",
    stderr: "",
    exitCode: 0,
  }),
}));

describe("メッセージバッファリング処理のテスト", () => {
  let mockSession: MockQSession;
  let App;

  beforeEach(async () => {
    vi.clearAllMocks();
    globalMockSession = null;
    App = (await import("../components/App")).App;
  });

  afterEach(async () => {
    if (globalMockSession) {
      globalMockSession.removeAllListeners();
      globalMockSession = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it("Given: 不完全な文章, When: データがストリーミングで送信される, Then: 改行が来るまでバッファリングされる", async () => {
    // Given
    const { lastFrame } = render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 200));

    mockSession = globalMockSession;

    // When: 文章を分割して送信
    if (mockSession) {
      // 短い不完全な文章を送信（改行なし、80文字未満、文末記号なし）
      mockSession.emit("data", "stdout", "Hello ");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 短い文章（80文字未満、文末記号なし）はバッファリングされる
      let output = lastFrame() || "";
      expect(output).not.toContain("Hello ");

      // 改行付きで続きを送信
      mockSession.emit("data", "stdout", "World!\n");
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Then: 完全な文章が表示される
      output = lastFrame() || "";
      expect(output).toContain("Hello World!");
    }
  });

  it("Given: 改行を含むデータ, When: データが送信される, Then: 改行ごとに行が分割される", async () => {
    // Given
    const { lastFrame } = render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 200));

    mockSession = globalMockSession;

    // When
    if (mockSession) {
      mockSession.emit("data", "stdout", "Line 1\nLine 2\nLine 3\n");
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Then
    const output = lastFrame() || "";
    expect(output).toContain("Line 1");
    expect(output).toContain("Line 2");
    expect(output).toContain("Line 3");
  });

  it("Given: 文末記号を含むデータ, When: 改行なしで送信される, Then: 改行が来るまでバッファリングされる", async () => {
    // Given
    const { lastFrame } = render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 200));

    mockSession = globalMockSession;

    // When: 文末記号（感嘆符）で終わるデータを送信
    if (mockSession) {
      mockSession.emit("data", "stdout", "Welcome to Amazon Q!");
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Then: パススルー方針のため改行が来るまで表示されない
      const output = lastFrame() || "";
      expect(output).not.toContain("Welcome to Amazon Q!");
    }
  });
});
