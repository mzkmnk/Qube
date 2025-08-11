/**
 * キーボード入力処理を管理するクラス
 * App.tsxから分離して単一責任原則を適用
 */

export interface KeyboardCallbacks {
  onExit: () => void;
  onInterrupt: () => void;
  onClear: () => void;
  onHistoryUp: () => void;
  onHistoryDown: () => void;
}

export interface KeyInfo {
  ctrl?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks;

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * キーボード入力を処理
   */
  handleInput(input: string, key: KeyInfo): void {
    // Ctrl+D: 終了
    if (key.ctrl && input === 'd') {
      this.callbacks.onExit();
      return;
    }

    // Ctrl+C: 中断
    if (key.ctrl && input === 'c') {
      this.callbacks.onInterrupt();
      return;
    }

    // Ctrl+L: クリア
    if (key.ctrl && input === 'l') {
      this.callbacks.onClear();
      return;
    }

    // 上矢印: 履歴を遡る
    if (key.upArrow) {
      this.callbacks.onHistoryUp();
      return;
    }

    // 下矢印: 履歴を進める
    if (key.downArrow) {
      this.callbacks.onHistoryDown();
      return;
    }
  }
}
