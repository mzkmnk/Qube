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
  const blockNextRef = React.useRef(false);
  const ctrlLTimeRef = React.useRef(0);
  const previousValueRef = React.useRef(value);
  
  // 親コンポーネントからの value 変更を反映
  useEffect(() => {
    setInternalValue(value);
    previousValueRef.current = value;
  }, [value]);
  
  // Ctrl キーの組み合わせを検出（より早いタイミングで検出）
  useInput((input, key) => {
    // Ctrl+L が押された場合
    if (key.ctrl && input === 'l') {
      blockNextRef.current = true;
      ctrlLTimeRef.current = Date.now();
      // フラグのリセットタイミングを調整
      setTimeout(() => {
        blockNextRef.current = false;
      }, 50); // タイムアウトを長めに設定
    }
  }, { isActive: focus });
  
  // TextInput の onChange をラップ
  const handleChange = (newValue: string) => {
    const now = Date.now();
    const timeSinceCtrlL = now - ctrlLTimeRef.current;
    
    // Ctrl+L 直後（50ms以内）の 'l' 追加を検出
    if ((blockNextRef.current || timeSinceCtrlL < 50) && 
        newValue === previousValueRef.current + 'l') {
      blockNextRef.current = false;
      // 内部値を元に戻す
      setInternalValue(previousValueRef.current);
      // onChange を呼ばない
      return;
    }
    
    // 正常な変更の場合
    setInternalValue(newValue);
    previousValueRef.current = newValue;
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
