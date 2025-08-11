import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectQCLI } from "../lib/q-cli-detector";
import child_process from "node:child_process";

vi.mock("node:child_process");
vi.mock("node:util", () => ({
  promisify: vi.fn((fn: unknown) => fn),
}));

describe("Q CLI検出", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.Q_BIN;
  });

  afterEach(() => {
    delete process.env.Q_BIN;
  });

  it("Q_BIN環境変数が設定されている場合、その値を返す", async () => {
    // Arrange
    process.env.Q_BIN = "/custom/path/to/q";
    const mockExec = vi
      .fn()
      .mockResolvedValue({ stdout: "/custom/path/to/q", stderr: "" });
    vi.mocked(child_process.exec).mockImplementation(
      mockExec as unknown as typeof child_process.exec,
    );

    // Act
    const result = await detectQCLI();

    // Assert
    expect(result).toBe("/custom/path/to/q");
    expect(mockExec).toHaveBeenCalledWith("which /custom/path/to/q");
  });

  it("Q_BIN環境変数が未設定の場合、PATHからamazonqを検索する", async () => {
    // Arrange
    const mockExec = vi
      .fn()
      .mockResolvedValue({ stdout: "/usr/local/bin/amazonq", stderr: "" });
    vi.mocked(child_process.exec).mockImplementation(
      mockExec as unknown as typeof child_process.exec,
    );

    // Act
    const result = await detectQCLI();

    // Assert
    expect(result).toBe("/usr/local/bin/amazonq");
    expect(mockExec).toHaveBeenCalledWith("which amazonq");
  });

  it("amazonqが見つからない場合、qを検索する", async () => {
    // Arrange
    const mockExec = vi
      .fn()
      .mockRejectedValueOnce(new Error("amazonq not found"))
      .mockResolvedValueOnce({ stdout: "/usr/local/bin/q", stderr: "" });
    vi.mocked(child_process.exec).mockImplementation(
      mockExec as unknown as typeof child_process.exec,
    );

    // Act
    const result = await detectQCLI();

    // Assert
    expect(result).toBe("/usr/local/bin/q");
    expect(mockExec).toHaveBeenCalledTimes(2);
    expect(mockExec).toHaveBeenNthCalledWith(1, "which amazonq");
    expect(mockExec).toHaveBeenNthCalledWith(2, "which q");
  });

  it("Q CLIが見つからない場合、エラーをスローする", async () => {
    // Arrange
    const mockExec = vi
      .fn()
      .mockRejectedValueOnce(new Error("amazonq not found"))
      .mockRejectedValueOnce(new Error("q not found"));
    vi.mocked(child_process.exec).mockImplementation(
      mockExec as unknown as typeof child_process.exec,
    );

    // Act & Assert
    await expect(detectQCLI()).rejects.toThrow(
      "Amazon Q CLI が見つかりません。Q_BIN 環境変数を設定するか、amazonq をインストールしてください。",
    );
  });

  it("Q_BIN環境変数の値が無効な場合、エラーをスローする", async () => {
    // Arrange
    process.env.Q_BIN = "/invalid/path/to/q";
    const mockExec = vi.fn().mockRejectedValue(new Error("not found"));
    vi.mocked(child_process.exec).mockImplementation(
      mockExec as unknown as typeof child_process.exec,
    );

    // Act & Assert
    await expect(detectQCLI()).rejects.toThrow(
      "Amazon Q CLI が見つかりません。Q_BIN 環境変数を設定するか、amazonq をインストールしてください。",
    );
  });
});
