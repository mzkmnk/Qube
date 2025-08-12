import React from "react";
import { render } from "ink-testing-library";
import { describe, it, expect } from "vitest";
import { Header } from "../components/Header";
import { Output } from "../components/Output";
import { Input } from "../components/Input";
import { StatusBar } from "../components/StatusBar";

describe("UI Component Tests - UIコンポーネントのテスト", () => {
  describe("Header Component", () => {
    it("Given: ヘッダーコンポーネント, When: 接続済み状態, Then: 接続ステータスが緑色で表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <Header title="Qube" version="0.1.0" connected={true} />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("◆");
      expect(output).toContain("Qube");
      expect(output).toContain("v0.1.0");
      expect(output).toContain("● Connected");
    });

    it("Given: ヘッダーコンポーネント, When: 接続中状態, Then: 接続ステータスが黄色で表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <Header title="Qube" version="0.1.0" connected={false} />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("○ Connecting...");
    });
  });

  describe("Output Component", () => {
    it("Given: 出力コンポーネント, When: メッセージが空, Then: 待機メッセージが表示される", () => {
      // Given & When
      const { lastFrame } = render(<Output lines={[]} />);

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("Waiting for output...");
    });

    it("Given: 出力コンポーネント, When: ユーザーメッセージ, Then: 生データがそのまま表示される", () => {
      // Given & When
      const { lastFrame } = render(<Output lines={["💬 Hello Q"]} />);

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("💬 Hello Q");
    });

    it("Given: 出力コンポーネント, When: エラーメッセージ, Then: 生データがそのまま表示される", () => {
      // Given & When
      const { lastFrame } = render(<Output lines={["❌ Error occurred"]} />);

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("❌ Error occurred");
    });

    it("Given: 出力コンポーネント, When: 成功メッセージ, Then: 生データがそのまま表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <Output lines={["✅ Connection successful"]} />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("✅ Connection successful");
    });

    it("Given: 出力コンポーネント, When: AIレスポンス, Then: 生データがそのまま表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <Output lines={["🤖 You are chatting with claude"]} />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("🤖 You are chatting with claude");
    });
  });

  describe("Input Component", () => {
    it("Given: 入力コンポーネント, When: 通常状態, Then: シアン色のプロンプトが表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <Input
          value=""
          disabled={false}
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("▶");
    });

    it("Given: 入力コンポーネント, When: 無効化状態, Then: グレーのプロンプトとProcessing表示", () => {
      // Given & When
      const { lastFrame } = render(
        <Input
          value=""
          disabled={true}
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("◌");
      expect(output).toContain("Processing...");
    });
  });

  describe("StatusBar Component", () => {
    it("Given: ステータスバー, When: Chatモード＆Ready状態, Then: 適切なステータスが表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <StatusBar mode="session" status="ready" showHelp={true} />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("●"); // Ready indicator
      expect(output).toContain("Chat");
      expect(output).toContain("^C Exit");
      expect(output).toContain("↑↓ History");
    });

    it("Given: ステータスバー, When: エラー状態, Then: エラーインジケーターが表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <StatusBar
          mode="command"
          status="error"
          errorCount={3}
          showHelp={false}
        />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("✗"); // Error indicator
      expect(output).toContain("[3]"); // Error count
    });

    it("Given: ステータスバー, When: 実行中状態, Then: 実行中インジケーターとコマンドが表示される", () => {
      // Given & When
      const { lastFrame } = render(
        <StatusBar
          mode="session"
          status="running"
          currentCommand="Hello Amazon Q"
          showHelp={false}
        />,
      );

      // Then
      const output = lastFrame() || "";
      expect(output).toContain("◌"); // Running indicator
      expect(output).toContain("Hello Amazon Q");
    });
  });
});
