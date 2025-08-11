import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ControlledTextInput } from './ControlledTextInput';

interface InputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export const Input: React.FC<InputProps> = ({ 
  value, 
  placeholder = 'Type your message...', 
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

  // 動的なプロンプト表示
  const promptDisplay = disabled ? '◌' : '▶';
  const promptColor = disabled ? 'gray' : 'cyan';

  return (
    <Box 
      borderStyle="single" 
      borderColor={disabled ? 'gray' : 'gray'}
      paddingX={1}
      marginTop={1}
    >
      <Box>
        <Text color={promptColor}>{promptDisplay} </Text>
        <ControlledTextInput
          value={value}
          placeholder={disabled ? 'Processing...' : placeholder}
          onChange={onChange}
          focus={!disabled}
        />
      </Box>
    </Box>
  );
};
