// vite.config.st.ts

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        // 設定ファイルが別なので outDir も変えると管理しやすい
        outDir: 'dist/student',
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/st/viewer.ts'),
            name: 'StudentViewer',
            fileName: () => 'student-viewer.js',
            formats: ['iife'] // 即時実行関数 (レガシーブラウザ用)
        },
        minify: 'terser',
        target: 'es2015', 
    }
});