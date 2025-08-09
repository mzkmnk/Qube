import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // ESM対応
    globals: false,
    // React/Inkテスト環境
    environment: 'node',
    // TypeScript設定
    includeSource: ['src/**/*.{ts,tsx}'],
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.ts',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    // ESMおよびTypeScriptパス解決
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
});