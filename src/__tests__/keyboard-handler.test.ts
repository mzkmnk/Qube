import { describe, it, expect, vi } from "vitest";
import { KeyboardHandler } from "../lib/keyboard-handler";

describe("KeyboardHandler", () => {
  describe("キーボードハンドラーの処理", () => {
    it("Ctrl+C押下時、exitコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act - Ctrl+Cの両方のパターンをテスト
      handler.handleInput("c", { ctrl: true });
      expect(mockCallbacks.onExit).toHaveBeenCalledTimes(1);

      mockCallbacks.onExit.mockClear();
      handler.handleInput("\x03", {});
      expect(mockCallbacks.onExit).toHaveBeenCalledTimes(1);
    });

    it("上矢印押下時、historyUpコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("", { upArrow: true });

      // Assert
      expect(mockCallbacks.onHistoryUp).toHaveBeenCalled();
    });

    it("下矢印押下時、historyDownコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("", { downArrow: true });

      // Assert
      expect(mockCallbacks.onHistoryDown).toHaveBeenCalled();
    });

    it("通常のキー入力では何も呼ばれない", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("a", {});

      // Assert
      expect(mockCallbacks.onExit).not.toHaveBeenCalled();
      expect(mockCallbacks.onHistoryUp).not.toHaveBeenCalled();
      expect(mockCallbacks.onHistoryDown).not.toHaveBeenCalled();
    });
  });
});
