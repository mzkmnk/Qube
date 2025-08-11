import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { spawnQ } from "../lib/spawn-q";
import { CommandExecutor } from "../lib/command-executor";
import type { QSession } from "../lib/q-session";

// モック
vi.mock("../lib/spawn-q", () => ({
  spawnQ: vi.fn(),
}));

// App.tsxから型をインポートする代わりに、テスト内で定義
type AppMode = "command" | "session";
type Status = "ready" | "running" | "error";

type MockSession = {
  start: Mock<[string], Promise<void>>;
  send: Mock<[string], void>;
  stop: Mock<[], void>;
  running: boolean;
};

type MockCallbacks = {
  onModeChange: Mock<[AppMode], void>;
  onStatusChange: Mock<[Status], void>;
  onOutput: Mock<[string | string[]], void>;
  onError: Mock<[string], void>;
};

describe("CommandExecutor", () => {
  let mockSession: MockSession;
  let mockCallbacks: MockCallbacks;
  let executor: CommandExecutor;
  let isSessionRunning: boolean;

  beforeEach(() => {
    vi.clearAllMocks();

    // QSessionのモック（runningはgetterとして提供）
    isSessionRunning = false;
    mockSession = {
      start: vi.fn(),
      send: vi.fn(),
      stop: vi.fn(),
      get running() {
        return isSessionRunning;
      },
    };

    // コールバックのモック
    mockCallbacks = {
      onModeChange: vi.fn(),
      onStatusChange: vi.fn(),
      onOutput: vi.fn(),
      onError: vi.fn(),
    };

    executor = new CommandExecutor(mockSession as QSession, mockCallbacks);
  });

  describe("コマンド実行", () => {
    it("空のコマンドは無視される", async () => {
      // Act
      await executor.execute("");
      await executor.execute("  ");

      // Assert
      expect(mockCallbacks.onOutput).not.toHaveBeenCalled();
      expect(mockCallbacks.onStatusChange).not.toHaveBeenCalled();
    });

    it("チャットセッション開始コマンドを処理", async () => {
      // Arrange
      const command = "q chat";

      // Act
      await executor.execute(command);

      // Assert
      expect(mockCallbacks.onModeChange).toHaveBeenCalledWith("session");
      expect(mockSession.start).toHaveBeenCalledWith("chat");
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it("翻訳セッション開始コマンドを処理", async () => {
      // Arrange
      const command = "q translate";

      // Act
      await executor.execute(command);

      // Assert
      expect(mockCallbacks.onModeChange).toHaveBeenCalledWith("session");
      expect(mockSession.start).toHaveBeenCalledWith("translate");
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it("セッション中のコマンドはセッションに送信", async () => {
      // Arrange
      isSessionRunning = true;
      const command = "test message";

      // Act
      await executor.execute(command, "session");

      // Assert
      expect(mockSession.send).toHaveBeenCalledWith(command);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
    });

    it("通常のQコマンドを実行", async () => {
      // Arrange
      const command = "q help";
      const mockResult = {
        stdout: "Help output\\nLine 2",
        exitCode: 0,
      };
      (spawnQ as Mock).mockResolvedValue(mockResult);

      // Act
      await executor.execute(command, "command");

      // Assert
      expect(spawnQ).toHaveBeenCalledWith(["help"]);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith(`💬 ${command}`);
      expect(mockCallbacks.onOutput).toHaveBeenCalledWith([
        "Help output",
        "Line 2",
      ]);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith("ready");
    });

    it("コマンド実行エラーを処理", async () => {
      // Arrange
      const command = "q invalid";
      const error = new Error("Command not found");
      (spawnQ as Mock).mockRejectedValue(error);

      // Act
      await executor.execute(command, "command");

      // Assert
      expect(mockCallbacks.onError).toHaveBeenCalledWith(error.message);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith("error");
    });

    it("実行中はstatusをrunningに設定", async () => {
      // Arrange
      const command = "q help";
      const statusCalls: string[] = [];
      mockCallbacks.onStatusChange.mockImplementation((status: string) => {
        statusCalls.push(status);
      });

      (spawnQ as Mock).mockResolvedValue({
        stdout: "output",
        exitCode: 0,
      });

      // Act
      await executor.execute(command, "command");

      // Assert
      expect(statusCalls[0]).toBe("running");
      expect(statusCalls[statusCalls.length - 1]).toBe("ready");
    });
  });
});
