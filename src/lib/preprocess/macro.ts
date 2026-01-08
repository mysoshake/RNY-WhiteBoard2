// ./src/app/lib/core/preprocess/macro.ts

import type { MacroDef } from "../core/type";

/**
 * 自作コマンドを正規表現で表す
 */
function createCommandRegex(commandName: string, argCount: number): RegExp {
  // 特殊文字をエスケープして正規表現化
  const escapedName = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
  let pattern = escapedName;
  for (let i = 0; i < argCount; i++) {
    pattern += '\\{([^}]*)\\}'; 
  }
  return new RegExp(pattern, 'g');
}

export function expandMacros(text: string, macros: MacroDef[]): string {
  macros.forEach((macro) => {
    const regex = createCommandRegex(macro.name, macro.argCount);
    text = text.replace(regex, (match, ...args) => {
      console.log(match, args);
      let result = macro.template;
      for (let i = 0; i < macro.argCount; i++) {
        result = result.split(`$${i + 1}`).join(args[i]);
      }
      return result;
    });
  });
  return text;
}

export function extractMacros(input: string): { cleanedText: string, macros: MacroDef[] } {
  let text = input;
  const macros: MacroDef[] = [];
  
  // 無限ループ防止のため、最大ループ回数を設ける（安全策）
  let loopLimit = 1000;
  
  while (loopLimit-- > 0) {
    // \def{@name}[N]{ の開始部分を探す
    const match = text.match(/\\def\{(@\w+)\}\[(\d+)\]\{/);
    
    // 見つからなければ終了
    if (!match || match.index === undefined) break;

    const name = match[1];
    const argCount = parseInt(match[2], 10);
    const startIndex = match.index;
    
    // 定義の中身の開始位置
    const contentStartIndex = startIndex + match[0].length;
    
    // 括弧のバランスをカウントして、対応する閉じ括弧 } を探す
    let braceCount = 1; // 最初の { 分
    let endIndex = -1;
    
    for (let i = contentStartIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      else if (text[i] === '}') braceCount--;
      
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      console.warn(`Macro definition error: Unclosed brace for ${name}`);
      break; // 安全のため抜ける
    }

    // テンプレート部分を抽出
    const template = text.substring(contentStartIndex, endIndex);
    
    macros.push({ name, argCount, template });

    // 元のテキストから定義部分を削除 (開始〜終了まで)
    // 削除後にループすることで、次の \def を探す
    text = text.substring(0, startIndex) + text.substring(endIndex + 1);
  }
  
  return { cleanedText: text, macros };
}