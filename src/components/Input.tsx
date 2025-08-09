import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ControlledTextInput } from './ControlledTextInput.js';

interface InputProps {
  prompt: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export const Input: React.FC<InputProps> = ({ 
  prompt, 
  value, 
  placeholder = '', 
  disabled = false,
  onChange, 
  onSubmit 
}) => {
  // Enterキーのハンドリング
  useInput((input, key) => {
    if (disabled) return;
    
    if (key.return) {
      onSubmit(value);
    }
  });

  return (
    <Box>
      <Text color={disabled ? 'gray' : 'green'}>{prompt} </Text>
      <ControlledTextInput
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        focus={!disabled}
      />
    </Box>
  );
};