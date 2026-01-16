// ./src/app/lib/core/preprocess/macro.ts

import { marked } from "marked";
import type { BoxType, MacroDef, PlaceHolder } from "../core/type";
import { putLogApp } from "../core/logger";

// /**
//  * 自作コマンドを正規表現で表す
//  */
// function createCommandRegex(commandName: string, argCount: number): RegExp {
//   // 特殊文字をエスケープして正規表現化
//   const escapedName = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
//   let pattern = escapedName;
//   for (let i = 0; i < argCount; i++) {
//     pattern += '\\{([^}]*)\\}'; 
//   }
//   return new RegExp("@" + pattern, 'g');
// }

/**
* テキスト内の, 最上位レベルの波括弧内の文字列をリストにして返す
* 例1: {A}{B}{{C}}
* => [ A , B , {C} ]
* 例2: FOO{A}{B}{{C}}
* => []
*/
function extractArgs(text: string, bracePairs: number): string[] {
  const foundArgs: string[] = [];
  if (!text.startsWith("{")) return foundArgs;
  
  // 括弧のバランスをカウントして、対応する閉じ括弧 } を探す
  let braceCount: number = 0;
  let aFoundText: string = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      braceCount++
    }
    else if (text[i] === '}') {
      braceCount--;
    }
    
    if (braceCount === 0) {
      aFoundText = aFoundText.substring(1); // { から始まるので削る
      foundArgs.push(aFoundText);
      aFoundText = "";
      
      // 必要な個数見つかったら終わり
      if (foundArgs.length === bracePairs) {
        // putLogApp("info", `必要数(${bracePairs}個)の引数を見つけました:`, foundArgs);
        return foundArgs;
      }
    }
    else if (braceCount >= 1) {
      aFoundText += text[i];
    }
    else {
      putLogApp("error", `Macro parse error: Over-closed braces at ${i} in text: ${text}`, text.substring(0, i));
      return [];
    }
  }
  
  // 与えられたテキストは括弧が閉じ切られていない
  putLogApp("error", `Macro parse error: Unclosed brace`, text);
  return [];
}

/**
* 気合でコマンドを置換する
* ボックスのヘッダを見ながら
*/
export function macrosToHtml(text: string, macros: MacroDef[], getPlaceholderCounter: () => number, placeholders: PlaceHolder, boxTypes: BoxType[]): string {
  
  let result = "";
  let rawMode: boolean = false;
  
  for (let itext = 0; itext < text.length; itext++) {
    const ch: string = text[itext];
    if (ch === "#") {
      boxTypes.forEach((box) => {
        if (text.substring(itext).startsWith(box.markSymbol)) {
          if(box.rawText) rawMode = true;
          else rawMode = false;
        }
      });
    }
    if (ch !== "@" || rawMode) {
      result += ch + '';
      continue;
    }
    
    // @が見つかった後ろを見てマクロ名と一致するかチェック
    for (let im = 0; im < macros.length; im++) {
      const macro = macros[im];
      
      // マクロの先頭 @NAME を探す
      const isMatched: boolean = text.substring(itext).startsWith("@" + macro.name);
      if (!isMatched) {
        continue;
      }

      // 最初のマクロ名 @NAME<<ｺｺ>> まで検索終了
      const macroNameEndAt = itext + (1 + macro.name.length);
      
      // 引数( @NAME{<<ｺｺﾄｶ>>}{<<ｺｺﾄｶ>>} )を読み取り
      const args: string[] = (macro.argCount === 0) ? [] : extractArgs(text.substring(macroNameEndAt), macro.argCount);
      if (args.length !== macro.argCount) {
        let lineNum = 1;
        text
          .substring(0, macroNameEndAt)
          .split("")
          .forEach((ch) => {
            if (ch === "\n") lineNum++;
          });
        putLogApp("debug", `マクロ(${macro.name})の引数の個数が合いません(row: ${lineNum}) Needed:${macro.argCount}, Given:${args.length}`);
        continue;
      }
      
      // 例: @NAME{arg1}{引数2} → <HOGE foo="引数2"> arg1 </HOGE>
      let aResult = macro.template; // <HOGE foo="\{2}"> \{1} </HOGE>
      let macroEndAt = macroNameEndAt;
      for (let iarg = 0; iarg < macro.argCount; iarg++) {
        // 仮引数(\{1}, \{2}, ...) をマクロ適用後の実引数に置換
        const replacedArg = macro.keepContent ? args[iarg] : macrosToHtml(args[iarg], macros, getPlaceholderCounter, placeholders, boxTypes);
        aResult = aResult.split(`\\{${iarg + 1}}`).join(replacedArg);
        macroEndAt += args[iarg].length + 2; // {arg} の分進める
      }

      // markedの置換も適用
      if (!macro.keepContent) aResult = marked.parseInline(aResult, { async: false }) as string;
      
      const key: string = `%%%CMD_PLACE_HOLDER_${getPlaceholderCounter()}%%%`;
      placeholders[key] = aResult;
      
      result += key;
      itext = macroEndAt - 1;
    }
  }
  // text = marked.parseInline(text, { async: false }) as string;
  return result;
}

// /* replaceによってマクロをHTMLに展開する */
// export function expandMacros(text: string, macros: MacroDef[], getPlaceholderCounter: () => number, placeholders: PlaceHolder): string {
//   macros.forEach((macro) => {
//     const regex = createCommandRegex(macro.name, macro.argCount);
//     text = text.replace(regex, (match, ...args) => {
//       putLogApp("debug", match, args);
//       let result = macro.template;
//       for (let i = 0; i < macro.argCount; i++) {
//         const replaced = expandMacros(args[i], macros, getPlaceholderCounter, placeholders);
//         result = result.split(`\\{${i + 1}}`).join(replaced);
//       }
//       result = marked.parseInline(result, { async: false }) as string;
//       const key = `%%%CMD_PLACE_HOLDER_${getPlaceholderCounter()}%%%`;
//       placeholders[key] = result;

//       return result;
//     });
//   });
//   // text = marked.parseInline(text, { async: false }) as string;
//   return text;
// }

export function extractMacros(input: string): { cleanedText: string, macros: MacroDef[] } {
  let text = input;
  const macros: MacroDef[] = [];
  
  // 無限ループ防止のため、最大ループ回数を設ける（安全策）
  let loopLimit = 1000;
  
  while (loopLimit-- > 0) {
    // \def{@name}[N]{ の開始部分を探す ↓@は name に入れないので (@\w+) にしない
    const match = text.match(/\\def\{@(\w+)\}\[(\d+)\]\{/);
    
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
      putLogApp("warn", `Macro definition error: Unclosed brace for ${name}`);
      break; // 安全のため抜ける
    }

    // テンプレート部分を抽出
    const template = text.substring(contentStartIndex, endIndex);
    
    putLogApp("info", `マクロ 定義: ${name}:[${argCount}]${template}`);
    macros.push({ name, argCount, template, keepContent:false });

    // 元のテキストから定義部分を削除 (開始〜終了まで)
    // 削除後にループすることで、次の \def を探す
    text = text.substring(0, startIndex) + text.substring(endIndex + 1);
  }
  
  return { cleanedText: text, macros };
}