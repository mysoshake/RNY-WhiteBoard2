// ./src/app/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { MacroDef, ParseResult } from '../lib/core/type';
import Problem from './component/Problem';

// --- ユーティリティ: 引数を抽出する正規表現生成 ---
function createCommandRegex(commandName: string, argCount: number): RegExp {
    let pattern = commandName.replace('@', '\\@'); // エスケープ
    for (let i = 0; i < argCount; i++) {
        pattern += '\\{([^}]*)\\}'; // {引数} をキャプチャ
    }
    return new RegExp(pattern, 'g');
}

// 独自マークダウンを解析し、HTMLと問題データを生成する
export function parseMarkdown(markdown: string): ParseResult {
  const problemData: ParseResult['problemData'] = [];
  const placeholders: { [key: string]: string } = {}; 
  let problemCounter = 0;
  let placeholderCounter = 0;
  
  const macros: MacroDef[] = [];
  const lines = markdown.split('\n');
  const processedLines: string[] = [];
  
  let inBlock = false;
  let problemBodyBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // --- \def (マクロ定義) の処理 ---
    // 構文: \def{@name}[N]{template}
    // 例: \def{@hello}[1]{こんにちは $1 さん}
    const defMatch = line.match(/^\\def\{(@\w+)\}\[(\d+)\]\{(.*)\}/);
    if (defMatch) {
        macros.push({
            name: defMatch[1],
            argCount: parseInt(defMatch[2], 10),
            template: defMatch[3]
        });
        continue; // 定義行は出力しない
    }
    
    // --- ブロック処理 ---
    if (inBlock) {
      if (line.trim() === '---') {
        const answerLine = lines[i + 1] || "";
        i++; 

        const index = problemCounter++;
        const answers = answerLine.split('|').map(a => a.trim()).filter(a => a);
        
        problemData.push({
            correctHashes: answers.map(a => simpleHash(a)),
            encryptedText: obfuscateAnswer(answers[0] || "")
        });

        const bufferedText = processInlineCommands(problemBodyBuffer.join('\n'), macros, placeholders, () => placeholderCounter++);
        const problemHtml = marked.parse(problemBodyBuffer.join('\n'), { async: false }) as string;

        // 変更: Problem関数を使用
        const htmlBlock = Problem(index, problemHtml);
        
        const placeholder = `%%%%PROBLEM_BLOCK_${index}%%%%`;
        placeholders[placeholder] = htmlBlock;
        processedLines.push(placeholder);

        inBlock = false;
        problemBodyBuffer = [];
      } else {
        problemBodyBuffer.push(line);
      }
      continue;
    }

    // --- 新しい問題ブロックの開始 ---
    if (line.trim() === '#pb') {
      inBlock = true;
      problemBodyBuffer = [];
      continue;
    }
    
    // --- 1行記述の問題の処理 ---
    if (line.startsWith('#pb ')) {
      const content = line.substring(4);
      const separatorIndex = content.indexOf('|');

      if (separatorIndex !== -1) {
        const questionMarkdown = content.substring(0, separatorIndex).trim();
        const answersPart = content.substring(separatorIndex + 1);
        const answers = answersPart.split('|').map(a => a.trim()).filter(a => a);

        if (answers.length > 0) {
          const index = problemCounter++;
          
          problemData.push({
              correctHashes: answers.map(a => simpleHash(a)),
              encryptedText: obfuscateAnswer(answers[0])
          });

          const questionHtml = marked.parse(questionMarkdown, { async: false }) as string;
          
          // 変更: Problem関数を使用
          const htmlBlock = Problem(index, questionHtml);
          // インライン処理 -> Markdown -> HTML
          const processedQ = processInlineCommands(questionText, macros, placeholders, () => placeholderCounter++);
          
          const placeholder = `%%%%PROBLEM_BLOCK_${index}%%%%`;
          placeholders[placeholder] = htmlBlock;
          processedLines.push(placeholder);

          
          continue;
        }
      }
    }
    
    // --- ボックス記法 (#ex, #pr, #as, #eg) の処理 ---
    // 共通処理のための正規表現マップ
    const boxTypes = [
        { tag: '#ex', className: 'box-ex' }, // 説明 (水色)
        { tag: '#pr', className: 'box-pr' }, // 練習 (黄色)
        { tag: '#as', className: 'box-as' }, // 課題 (赤色)
        { tag: '#eg', className: 'box-eg' }  // 例 (紫)
    ];

    let matchFound = false;
    for (const box of boxTypes) {
        // 行頭が "#tag " で始まるかチェック
        const regex = new RegExp(`^${box.tag}\\s+(.*)`);
        const match = line.match(regex);
        if (match) {
            const title = match[1];
            // 共通クラス box-common と、色別のクラスを付与
            const html = `<div class="box-common ${box.className}"><h3>${title}</h3></div>`;
            processedLines.push(html);
            matchFound = true;
            break;
        }
    }
    if (matchFound) continue;

    // 通常行
    processedLines.push(line);
  }

  const fullText = processedLines.join('\n');
  const textWithCommands = processInlineCommands(fullText, macros, placeholders, () => placeholderCounter++);
  
  let finalHtml = marked.parse(textWithCommands, { async: false }) as string;

  Object.keys(placeholders).forEach(key => {
    finalHtml = finalHtml.split(`<p>${key}</p>`).join(placeholders[key]);
    finalHtml = finalHtml.split(key).join(placeholders[key]);
  });

  return {
    html: finalHtml,
    problemData: problemData
  };
}

// インラインコマンドの処理
function processInlineCommands(
    text: string, 
    macros: MacroDef[], 
    placeholders: { [key: string]: string },
    getCounter: () => number
): string {
    let currentText = text;

    // 1. マクロの展開 (テキスト置換)
    // 定義された順に適用 (後勝ちや依存関係に注意)
    macros.forEach(macro => {
        const regex = createCommandRegex(macro.name, macro.argCount);
        currentText = currentText.replace(regex, (match, ...args) => {
            let result = macro.template;
            // $1, $2, ... を引数で置換
            for (let i = 0; i < macro.argCount; i++) {
                // args[i] が引数の中身
                result = result.replace(new RegExp(`\\$${i + 1}`, 'g'), args[i]);
            }
            return result;
        });
    });

    // 2. 組み込みコマンド: @red{text}
    // HTMLタグを生成し、markedに壊されないようプレースホルダー化する
    // ただし、中身(text)はMarkdown記法を含む可能性があるので marked.parseInline する
    const regexRed = /@red\{([^}]*)\}/g;
    currentText = currentText.replace(regexRed, (_, content) => {
        // 中身をインラインMarkdown変換
        const innerHtml = marked.parseInline(content, { async: false }) as string;
        const html = `<span style="color:red">${innerHtml}</span>`;
        
        const key = `RNY_INLINE_CMD_${getCounter()}`;
        placeholders[key] = html;
        return key;
    });

    // 3. 組み込みコマンド: @img{src}{alt}{w}{h}
    // w, h が '*' の場合は auto にするなどの処理
    const regexImg = /@img\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
    currentText = currentText.replace(regexImg, (_, src, alt, w, h) => {
        const widthAttr = w === '*' ? '' : `width="${w}"`;
        const heightAttr = h === '*' ? '' : `height="${h}"`;
        // 画像はブロック要素的に扱いたい場合とインラインの場合があるが、今回はインラインimg
        const html = `<img src="${src}" alt="${alt}" ${widthAttr} ${heightAttr} style="max-width:100%; vertical-align:middle;" />`;
        
        const key = `RNY_INLINE_CMD_${getCounter()}`;
        placeholders[key] = html;
        return key;
    });

    return currentText;
}