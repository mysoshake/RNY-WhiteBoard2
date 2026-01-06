import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './parser';
import { simpleHash, deobfuscateAnswer } from '../lib/core/cryption';

describe('Markdown Parser', () => {

    // 1. 基本的な1行問題のテスト
    it('should parse single line problem (#pb)', () => {
        const markdown = `#pb 1+1は？ | 2`;
        const result = parseMarkdown(markdown);

        // HTMLにプレースホルダーが含まれていないこと（置換済みであること）
        expect(result.html).not.toContain('RNY_PROBLEM_BLOCK');
        expect(result.html).toContain('class="problem-container"');
        expect(result.html).toContain('1+1は？');

        // データが抽出されていること
        expect(result.problemData).toHaveLength(1);
        expect(result.problemData[0].correctHashes).toContain(simpleHash('2'));
    });

    // 2. 複数回答のテスト
    it('should handle multiple answers', () => {
        const markdown = `#pb 挨拶は？ | こんにちは | Hello | Hi`;
        const result = parseMarkdown(markdown);

        const data = result.problemData[0];
        // 答えが3つあるか
        expect(data.correctHashes).toHaveLength(3);
        expect(data.correctHashes).toContain(simpleHash('こんにちは'));
        expect(data.correctHashes).toContain(simpleHash('Hello'));
        expect(data.correctHashes).toContain(simpleHash('Hi'));
        
        // 手動復号をやめて、正規の復号関数を使って検証する　意味はあるのだろうか
        const decrypted = deobfuscateAnswer(data.encryptedText);
        expect(decrypted).toBe('こんにちは');
    });

    // 3. 複数行ブロックのテスト
    it('should parse multi-line block problem', () => {
        const markdown = `
#pb
これは
複数行の
問題です
---
正解
        `.trim();
        
        const result = parseMarkdown(markdown);

        expect(result.html).toContain('複数行の');
        expect(result.problemData[0].correctHashes).toContain(simpleHash('正解'));
    });

    // 4. ボックス記法(#ex, #pr...)のテスト
    it('should parse box tags', () => {
        const markdown = `
#ex 説明ボックス
#pr 練習ボックス
#as 課題ボックス
#eg 例ボックス
        `.trim();
        const result = parseMarkdown(markdown);

        expect(result.html).toContain('class="box-common box-ex"');
        expect(result.html).toContain('class="box-common box-pr"');
        expect(result.html).toContain('class="box-common box-as"');
        expect(result.html).toContain('class="box-common box-eg"');
        expect(result.html).toContain('<h3>説明ボックス</h3>');
    });

    // 5. 混合テスト
    it('should handle mixed content correctly', () => {
        const markdown = `
# タイトル
普通のテキスト

#pb 問1 | A
#ex 解説
#pb 問2 | B
        `.trim();

        const result = parseMarkdown(markdown);
        expect(result.problemData).toHaveLength(2);
        // 問1の正解
        expect(result.problemData[0].correctHashes).toContain(simpleHash('A'));
        // 問2の正解
        expect(result.problemData[1].correctHashes).toContain(simpleHash('B'));
    });
});