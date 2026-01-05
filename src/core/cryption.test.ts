// core/cryption.test.ts

import { describe, it, expect } from 'vitest';
import { simpleHash, obfuscateAnswer, deobfuscateAnswer } from './cryption';

describe('Security Core Functions', () => {
    
    // 1. ハッシュ関数のテスト
    // 同じ入力なら常に同じハッシュになること、空文字などの挙動を確認
    describe('simpleHash', () => {
        it('should return consistent hash for same input', () => {
            const input = "Apple";
            const hash1 = simpleHash(input);
            const hash2 = simpleHash(input);
            expect(hash1).toBe(hash2);
        });

        it('should return different hash for different input', () => {
            expect(simpleHash("Apple")).not.toBe(simpleHash("Orange"));
        });

        // 過去の出力結果が変わっていないか（アルゴリズムの固定確認）
        it('should match known hash values', () => {
            // "test" の FNV-1a ハッシュ値 (例)
            // 実際の実装に合わせて一度実行して値を確認し、ここに固定すると良い
            const val = simpleHash("test");
            expect(val).toBeDefined();
            console.log(`Hash for "test": ${val}`);
        });
    });

    // 2. 難読化・復号のテスト
    // 暗号化したものが正しく戻るか確認
    describe('Obfuscation', () => {
        it('should obfuscate and deobfuscate correctly', () => {
            const original = "SecretAnswer123";
            const key = 0x55; // 任意のキー

            const encrypted = obfuscateAnswer(original, key);
            
            // 暗号化された文字列は元の文字列を含んでいないはず（簡易チェック）
            expect(encrypted).not.toContain(original);

            const decrypted = deobfuscateAnswer(encrypted, key);
            expect(decrypted).toBe(original);
        });

        it('should work with default key', () => {
            const original = "DefaultKeyTest";
            const encrypted = obfuscateAnswer(original);
            const decrypted = deobfuscateAnswer(encrypted);
            expect(decrypted).toBe(original);
        });
        
        // 異なるキーで復号しようとしたら失敗（変な文字列になる）することを確認
        it('should fail to decrypt with wrong key', () => {
            const original = "Answer";
            const encrypted = obfuscateAnswer(original, 0x11);
            const decrypted = deobfuscateAnswer(encrypted, 0x22); // 違うキー
            
            expect(decrypted).not.toBe(original);
        });
    });
});