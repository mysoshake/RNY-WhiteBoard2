// vite.config.tc.ts

import { defineConfig } from 'vite';

export default defineConfig({
    // 開発サーバーの設定
    server: {
        open: true, // 自動でブラウザを開く
    },
    build: {
        outDir: 'dist/teacher',
        emptyOutDir: true,
        target: 'esnext', // 教員側は最新ブラウザ前提
    }
});