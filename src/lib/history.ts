/**
 * コマンド履歴を管理するクラス
 */
export class CommandHistory {
  private history: string[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * コマンドを履歴に追加
   */
  add(command: string): void {
    // 空のコマンドは追加しない
    if (!command.trim()) return;

    // 重複を削除（既存のものを削除して最新として追加）
    const existingIndex = this.history.indexOf(command);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // 履歴に追加
    this.history.push(command);

    // 最大数を超えたら古いものを削除
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }

    // インデックスをリセット
    this.currentIndex = this.history.length;
  }

  /**
   * 前の履歴を取得
   */
  getPrevious(): string {
    if (this.history.length === 0) return '';

    if (this.currentIndex > 0) {
      this.currentIndex--;
    }

    return this.history[this.currentIndex] || '';
  }

  /**
   * 次の履歴を取得
   */
  getNext(): string {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }

    // 最新を超えたら空文字を返す
    this.currentIndex = this.history.length;
    return '';
  }

  /**
   * すべての履歴を取得
   */
  getAll(): string[] {
    return [...this.history];
  }

  /**
   * 履歴をクリア
   */
  reset(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 現在の位置をリセット
   */
  resetPosition(): void {
    this.currentIndex = this.history.length;
  }
}