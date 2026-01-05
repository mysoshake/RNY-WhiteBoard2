import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        // 設定ファイルが別なので outDir も変えると管理しやすい
        outDir: 'dist/student',
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/st/logic.ts'),
            name: 'StudentLogic',
            fileName: () => 'student-logic.js',
            formats: ['iife'] // 即時実行関数 (レガシーブラウザ用)
        },
        minify: 'terser',
        // Chrome 50 (2016) は ES2015(ES6) を概ねサポートしています
        target: 'es2015', 
    }
});