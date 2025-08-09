#!/usr/bin/env node
import * as esbuild from 'esbuild'
import { readFileSync } from 'fs'

// package.jsonを読み込んで外部依存を抽出
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const external = Object.keys(pkg.dependencies || {})

await esbuild.build({
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: [...external, 'node:*'],
  banner: {
    js: '#!/usr/bin/env node\n'
  },
  sourcemap: true,
  minify: false,
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts'
  }
})

console.log('✅ Build completed')