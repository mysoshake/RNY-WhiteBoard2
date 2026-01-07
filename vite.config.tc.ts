// vite.config.tc.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/RNY-WhiteBoard2/',
  // 開発サーバーの設定
  server: {
    open: true, // 自動でブラウザを開く
  },
  build: {
    outDir: 'dist/teacher',
    emptyOutDir: true,
    target: 'esnext', // 教員側は最新ブラウザ前提
  },
  plugins: [react()],
});