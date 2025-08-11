import { describe, it, expect, vi } from "vitest";
import { KeyboardHandler } from "../lib/keyboard-handler";

describe("KeyboardHandler", () => {
  describe("キーボードハンドラーの処理", () => {
    it("Ctrl+D押下時、exitコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("d", { ctrl: true });

      // Assert
      expect(mockCallbacks.onExit).toHaveBeenCalled();
      expect(mockCallbacks.onInterrupt).not.toHaveBeenCalled();
    });

    it("Ctrl+C押下時、interruptコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("c", { ctrl: true });

      // Assert
      expect(mockCallbacks.onInterrupt).toHaveBeenCalled();
      expect(mockCallbacks.onExit).not.toHaveBeenCalled();
    });

    it("Ctrl+L押下時、clearコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("l", { ctrl: true });

      // Assert
      expect(mockCallbacks.onClear).toHaveBeenCalled();
    });

    it("上矢印押下時、historyUpコールバックが呼ばれる", () => {
      // Arrange
      const mockCallbacks = {
        onExit: vi.fn(),
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
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
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
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
        onInterrupt: vi.fn(),
        onClear: vi.fn(),
        onHistoryUp: vi.fn(),
        onHistoryDown: vi.fn(),
      };
      const handler = new KeyboardHandler(mockCallbacks);

      // Act
      handler.handleInput("a", {});

      // Assert
      expect(mockCallbacks.onExit).not.toHaveBeenCalled();
      expect(mockCallbacks.onInterrupt).not.toHaveBeenCalled();
      expect(mockCallbacks.onClear).not.toHaveBeenCalled();
      expect(mockCallbacks.onHistoryUp).not.toHaveBeenCalled();
      expect(mockCallbacks.onHistoryDown).not.toHaveBeenCalled();
    });
  });
});
