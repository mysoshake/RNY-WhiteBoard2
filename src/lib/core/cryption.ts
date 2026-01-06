// ./src/lib/core/cryption.ts

/**
 * 文字列から簡易的なハッシュ値を生成 (FNV-1a algorithm)
 */
export function simpleHash(str: string): string
{
    let hash = 0x811c9dc5;
    
    for (let i = 0; i < str.length; i++)
    {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    
    return (hash >>> 0).toString(16);
}

/**
 * 答えを難読化 (XOR + Base64)
 * 安全な実装: encodeURIComponentでASCII化してからXORをかける
 */
export function obfuscateAnswer(answer: string, key: number = 0x42): string
{
    // 1. 日本語を %XX 形式のASCII文字列に変換
    // これにより、XOR対象がすべて1バイト文字(ASCII)になるため安全
    const utf8Str = encodeURIComponent(answer);
    
    let result = "";
    for (let i = 0; i < utf8Str.length; i++)
    {
        // 2. 各文字にXORをかける
        result += String.fromCharCode(utf8Str.charCodeAt(i) ^ key);
    }
    
    // 3. Base64化 (resultはASCII範囲内なのでbtoaで安全に変換可能)
    return btoa(result);
}

/**
 * 難読化を解除
 */
export function deobfuscateAnswer(obfuscated: string, key: number = 0x42): string
{
    try {
        const raw = atob(obfuscated);
        let result = "";
        for (let i = 0; i < raw.length; i++)
        {
            result += String.fromCharCode(raw.charCodeAt(i) ^ key);
        }
        // 元の日本語に戻す (%XX形式 -> 日本語)
        return decodeURIComponent(result);
    } catch (e) {
        console.error("Decryption failed:", e);
        return "Decryption Error";
    }
}