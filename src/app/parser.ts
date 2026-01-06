// ./src/app/parser.ts

import { marked, parseInline } from 'marked';
import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { MacroDef, ParseResult, ProblemItem } from '../lib/core/type';
import Problem from './component/Problem';

// --- ユーティリティ: コマンド使用箇所の正規表現生成 ---
function createCommandRegex(commandName: string, argCount: number): RegExp {
  // 特殊文字をエスケープして正規表現化
  const escapedName = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
  let pattern = escapedName;
  for (let i = 0; i < argCount; i++) {
    pattern += '\\{([^}]*)\\}'; 
  }
  return new RegExp(pattern, 'g');
}

function extractMacros(input: string): { cleanedText: string, macros: MacroDef[] } {
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

// インラインコマンドの処理
function processInlineCommands(
  text: string, 
  macros: MacroDef[], 
  placeholders: { [key: string]: string },
  getCounter: () => number
): string {
  let currentText = text;

  // 1. マクロ展開
  macros.forEach(macro => {
    const regex = createCommandRegex(macro.name, macro.argCount);
    currentText = currentText.replace(regex, (match, ...args) => {
      console.log(match, args);
      let result = macro.template;
      for (let i = 0; i < macro.argCount; i++) {
        result = result.split(`$${i + 1}`).join(args[i]);
      }
      return result;
    });
  });

  // 2. @red
  const regexRed = /@red\{([^}]*)\}/g;
  currentText = currentText.replace(regexRed, (_, content) => {
    // 中身もMarkdownパースする
    const innerHtml = marked.parseInline(content, { async: false }) as string;
    const html = `<span style="color:red">${innerHtml}</span>`;
    
    const key = `RNY_INLINE_CMD_${getCounter()}`;
    placeholders[key] = html;
    return key;
  });

  // 3. @img
  const regexImg = /@img\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
  currentText = currentText.replace(regexImg, (_, src, alt, w, h) => {
    const widthAttr = w === '*' ? '' : `width="${w}"`;
    const heightAttr = h === '*' ? '' : `height="${h}"`;
    const html = `<img src="${src}" alt="${alt}" ${widthAttr} ${heightAttr} style="max-width:100%; vertical-align:middle;" />`;
    
    const key = `RNY_INLINE_CMD_${getCounter()}`;
    placeholders[key] = html;
    return key;
  });

  return currentText;
}

// プレースホルダーを再帰的に復元する関数
function restorePlaceholders(html: string, placeholders: { [key: string]: string }): string {
    let result = html;
    let hasMatch = true;
    let loopLimit = 100; // 無限ループ防止

    while (hasMatch && loopLimit-- > 0) {
        hasMatch = false;
        Object.keys(placeholders).forEach(key => {
            if (result.includes(key)) {
                hasMatch = true;
                // Pタグで囲まれた場合とそのままの場合の両方を置換
                result = result.split(`<p>${key}</p>`).join(placeholders[key]);
                result = result.split(key).join(placeholders[key]);
            }
        });
    }
    return result;
}

// 独自マークダウンを解析し、HTMLと問題データを生成する
export function parseMarkdown(markdown: string): ParseResult {
  const problemData: ProblemItem[] = [];
  const placeholders: { [key: string]: string } = {}; 
  let problemCounter = 0;
  let placeholderCounter = 0;

  // 【変更点】最初に行分割せず、マクロ定義を全文から抽出・削除する
  const { cleanedText, macros } = extractMacros(markdown);

  // マクロ定義除去後のテキストを行分割して解析
  const lines = cleanedText.split('\n');
  let processedLines: string[] = [];
  
  let inProblemBlock = false;
  let problemBodyBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // --- ブロック処理 (Problem) ---
    if (inProblemBlock) {
      if (line.trim() === '---') {
      const answerLine = lines[i + 1] || "";
      i++; 
      const index = problemCounter++;
      const answers = answerLine.split('|').map(a => a.trim()).filter(a => a);
      
      problemData.push({
        correctHashes: answers.map(a => simpleHash(a)),
        encryptedText: obfuscateAnswer(answers[0] || "")
      });

      // インライン処理
      const textWithCommands = processInlineCommands(problemBodyBuffer.join('\n'), macros, placeholders, () => placeholderCounter++);
      const problemHtml = marked.parse(textWithCommands, { async: false }) as string;
      
      const htmlBlock = Problem(index, problemHtml);
      const placeholder = `RNY_PROBLEM_BLOCK_${index}`;
      placeholders[placeholder] = htmlBlock;
      processedLines.push(placeholder);

      inProblemBlock = false;
      problemBodyBuffer = [];
      } else {
        problemBodyBuffer.push(line);
      }
      continue;
    }

    if (line.trim() === '#pb') {
      inProblemBlock = true;
      problemBodyBuffer = [];
      continue;
    }

    if (line.startsWith('#pb ')) {
      const content = line.substring(4);
      const separatorIndex = content.indexOf('|');

      if (separatorIndex !== -1) {
      const questionText = content.substring(0, separatorIndex).trim();
      const answersPart = content.substring(separatorIndex + 1);
      const answers = answersPart.split('|').map(a => a.trim()).filter(a => a);

      if (answers.length > 0) {
        const index = problemCounter++;
        problemData.push({
          correctHashes: answers.map(a => simpleHash(a)),
          encryptedText: obfuscateAnswer(answers[0])
        });

          // 1. インライン処理
          const textWithCommands = processInlineCommands(questionText, macros, placeholders, () => placeholderCounter++);
          // 2. Markdown変換
          const questionHtml = marked.parse(textWithCommands, { async: false }) as string;
          const htmlBlock = Problem(index, questionHtml);
          
          const placeholder = `RNY_PROBLEM_BLOCK_${index}`;
          placeholders[placeholder] = htmlBlock;
          processedLines.push(placeholder);
          continue;
        }
      }
    }

    // --- ボックス処理 ---
    const boxTypes = [
      { tag: '#ex', className: 'box-ex' },
      { tag: '#pr', className: 'box-pr' },
      { tag: '#as', className: 'box-as' },
      { tag: '#eg', className: 'box-eg' }
    ];
    let matchFound = false;
    for (const box of boxTypes) {
      const regex = new RegExp(`^${box.tag}\\s+(.*)`);
      const match = line.match(regex);
      if (match) {
        const title = processInlineCommands(match[1], macros, placeholders, () => placeholderCounter++);
        processedLines.push(`<div class="box-common ${box.className}"><h3>${title}</h3></div>`);
        matchFound = true;
        break;
      }
    }
    if (matchFound) continue;

    processedLines.push(line);
  }

  // ブロック外テキストのインライン処理
  const fullText = processedLines.join('\n');
  const textWithCommands = processInlineCommands(fullText, macros, placeholders, () => placeholderCounter++);

  let finalHtml = marked.parse(textWithCommands, { async: false }) as string;
  finalHtml = restorePlaceholders(finalHtml, placeholders);

  Object.keys(placeholders).forEach(key => {
    finalHtml = finalHtml.split(`<p>${key}</p>`).join(placeholders[key]);
    finalHtml = finalHtml.split(key).join(placeholders[key]);
  });

  return {
    html: finalHtml,
    problemData: problemData 
  };
}