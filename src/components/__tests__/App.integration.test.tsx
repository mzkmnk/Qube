import React from "react";
import { render } from "ink-testing-library";
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { App } from "../App";

// QSessionのモック
vi.mock("../../lib/q-session", () => {
  const EventEmitter = require("events").EventEmitter;
  
  class MockQSession extends EventEmitter {
    running = false;
    initialized = false;
    
    async start() {
      this.running = true;
      // 初期化処理をシミュレート
      setTimeout(() => {
        this.initialized = true;
        this.emit("initialized");
      }, 50);
      return Promise.resolve();
    }
    
    stop() {
      this.running = false;
    }
    
    send() {}
    
    getInitializationBuffer() {
      return [];
    }
  }
  
  return {
    QSession: MockQSession
  };
});

// clearTerminalのモック
vi.mock("../../lib/terminal", () => ({
  clearTerminal: vi.fn()
}));

// detectQCLIのモック
vi.mock("../../lib/q-cli-detector", () => ({
  detectQCLI: vi.fn().mockResolvedValue("/usr/local/bin/q")
}));

// figletのモック
vi.mock("figlet", () => {
  return {
    default: {
      text: (text: string, options: any, callback: (err: any, data?: string) => void) => {
        // QUBEという文字列のASCIIアート
        callback(null, "QUBE");
      }
    }
  };
});

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
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // QUBEロゴが表示されている（ASCIIアートかテキスト）
    const frame = lastFrame();
    expect(frame).toContain("QUBE");
  });

  test("初期化完了後、'Waiting for output...'は表示されない", async () => {
    const { lastFrame } = render(<App version="1.0.0" />);
    
    // 初期化を待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    
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