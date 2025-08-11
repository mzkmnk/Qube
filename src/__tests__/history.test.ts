import { describe, it, expect, beforeEach } from 'vitest';
import { CommandHistory } from '../lib/history.js';

describe('CommandHistory', () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = new CommandHistory();
  });

  it('コマンドを追加できる', () => {
    history.add('command1');
    history.add('command2');
    
    expect(history.getAll()).toEqual(['command1', 'command2']);
  });

  it('重複したコマンドは最新の位置に移動する', () => {
    history.add('command1');
    history.add('command2');
    history.add('command1');
    
    expect(history.getAll()).toEqual(['command2', 'command1']);
  });

  it('前の履歴を取得できる', () => {
    history.add('command1');
    history.add('command2');
    history.add('command3');
    
    expect(history.getPrevious()).toBe('command3');
    expect(history.getPrevious()).toBe('command2');
    expect(history.getPrevious()).toBe('command1');
  });

  it('次の履歴を取得できる', () => {
    history.add('command1');
    history.add('command2');
    history.add('command3');
    
    history.getPrevious(); // command3
    history.getPrevious(); // command2
    
    expect(history.getNext()).toBe('command3');
    expect(history.getNext()).toBe('');
  });

  it('履歴の最大数を制限できる', () => {
    const limitedHistory = new CommandHistory(3);
    
    limitedHistory.add('command1');
    limitedHistory.add('command2');
    limitedHistory.add('command3');
    limitedHistory.add('command4');
    
    const all = limitedHistory.getAll();
    expect(all).toHaveLength(3);
    expect(all).toEqual(['command2', 'command3', 'command4']);
  });

  it('履歴をリセットできる', () => {
    history.add('command1');
    history.add('command2');
    
    history.reset();
    
    expect(history.getAll()).toEqual([]);
  });

  it('現在の位置をリセットできる', () => {
    history.add('command1');
    history.add('command2');
    
    history.getPrevious();
    history.resetPosition();
    
    // リセット後は最新の位置に戻る
    expect(history.getPrevious()).toBe('command2');
  });
});