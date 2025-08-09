import React, { useState, useEffect } from 'react';
import { useInput, useStdin } from 'ink';
import TextInput from 'ink-text-input';

interface ControlledTextInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  focus?: boolean;
}

/**
 * Ctrl キーの組み合わせを適切にフィルタリングする TextInput ラッパー
 * ink-text-input が Ctrl+L などのキーバインドで文字を入力してしまう問題を解決
 */
export const ControlledTextInput: React.FC<ControlledTextInputProps> = ({
  value,
  placeholder,
  onChange,
  focus = true
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [skipNextChange, setSkipNextChange] = useState(false);
  
  // 親コンポーネントからの value 変更を反映
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  // Ctrl キーの組み合わせを検出してフラグを設定
  useInput((input, key) => {
    // Ctrl キーの組み合わせが押された場合
    if (key.ctrl && input !== 'd') {
      // 次の onChange をスキップするフラグを立てる
      setSkipNextChange(true);
      // タイミングをずらしてフラグをリセット
      setTimeout(() => setSkipNextChange(false), 50);
    }
  }, { isActive: focus });
  
  // TextInput の onChange をラップ
  const handleChange = (newValue: string) => {
    // Ctrl キーの組み合わせによる変更の場合はスキップ
    if (skipNextChange) {
      setSkipNextChange(false);
      // 内部値を元に戻す
      setInternalValue(value);
      return;
    }
    
    // Ctrl+L で 'l' が追加される問題を検出
    // 値が1文字だけ増えて、その文字が 'l' の場合は無視
    if (newValue.length === value.length + 1 && 
        newValue.slice(-1) === 'l' &&
        newValue.slice(0, -1) === value) {
      // 最近 Ctrl が押された可能性があるので無視
      return;
    }
    
    setInternalValue(newValue);
    onChange(newValue);
  };
  
  return (
    <TextInput
      value={internalValue}
      placeholder={placeholder}
      onChange={handleChange}
      focus={focus}
    />
  );
};