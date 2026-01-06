// core/cryption.ts

/**
 * 文字列から簡易的なハッシュ値を生成 (FNV-1a algorithm)
 * 生徒側(古いChrome)でも動作するよう、基本的な演算のみ使用
 */
export function simpleHash(str: string): string {
    let hash = 0x811c9dc5;
    
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // 32-bit integer multiplication check
        hash = Math.imul(hash, 0x01000193);
    }
    
    // 符号なし16進数文字列に変換
    return (hash >>> 0).toString(16);
}

// 日本語対応の btoa
function encode(str: string) {
  const charCodes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...charCodes));
}

// 日本語対応の atob
function decode(str: string) {
  const utf8Array = Uint8Array.from(
    Array.from(atob(str)).map((s) => s.charCodeAt(0)),
  );
  return new TextDecoder().decode(utf8Array);
}

// 答えを難読化 (XOR + Base64)
export function obfuscateAnswer(answer: string, key: number = 0x42): string {
    let result = "";
    for (let i = 0; i < answer.length; i++) {
        result += String.fromCharCode(answer.charCodeAt(i) ^ key);
    }
    return encode(result);
}

// 難読化を解除
export function deobfuscateAnswer(obfuscated: string, key: number = 0x42): string {
    const raw = decode(obfuscated);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
        result += String.fromCharCode(raw.charCodeAt(i) ^ key);
    }
    return result;
}