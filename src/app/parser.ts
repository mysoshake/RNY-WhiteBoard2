// ./src/app/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { MacroDef, ParseResult, ProblemItem } from '../lib/core/type';
import Problem from './component/Problem';
import { expandMacros, extractMacros } from '../lib/preprocess/macro';
import { NAMED_COLORS } from '../lib/core/colornames';

/**
 * 独自マークダウン( + 通常のMD)を解析し、HTMLソースコードを生成する
 */
export function parseMarkdown(markdown: string): ParseResult {
  const problemData: ProblemItem[] = [];
  const placeholders: { [key: string]: string } = {}; 
  let problemCounter = 0;
  let placeholderCounter = 0;

  // 最初に行分割せず、マクロ定義を全文から抽出・削除する
  const { cleanedText, macros } = extractMacros(markdown);

  // マクロ定義除去後のテキストを行分割して解析
  const lines = cleanedText.split('\n');
  let processedLines: string[] = [];
  
  let inBlock = false;
  let problemBodyBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // --- ブロック処理 ---
    if (inBlock) {
      // ブロック閉じ
      if (line.trim() === '!#pb') {
        const answerLine = lines[i + 1] || "";
        i++; 
        const index = problemCounter++;
        const answers = answerLine
          .split('|')
          .map(a => a.trim())
          .filter(a => a);
        const hashAnswers = answers.map(a => simpleHash(a));
        const encAnswer = obfuscateAnswer(answers[0] || "");
        problemData.push({
          mode: 'quiz',
          correctHashes: hashAnswers,
          encryptedText: encAnswer
        });

        const textWithCommands = processCommands(problemBodyBuffer.join('\n'), macros, placeholders, () => placeholderCounter++);
        const problemHtml = marked.parse(textWithCommands, { async: false }) as string;
        
        const htmlBlock = Problem(index, problemHtml);
        const placeholder = `%%%CMD_PLACE_HOLDER_${index}%%%`;
        placeholders[placeholder] = htmlBlock;
        processedLines.push(placeholder);

        inBlock = false;
        problemBodyBuffer = [];
      } else {
        problemBodyBuffer.push(line);
      }
      continue;
    }

    if (line.trim() === '#pb') {
      inBlock = true;
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
          mode: 'quiz',
          correctHashes: answers.map(a => simpleHash(a)),
          encryptedText: obfuscateAnswer(answers[0])
        });

          // 1. インライン処理
          const textWithCommands = processCommands(questionText, macros, placeholders, () => placeholderCounter++);
          // 2. Markdown変換
          const questionHtml = marked.parse(textWithCommands, { async: false }) as string;
          const htmlBlock = Problem(index, questionHtml);
          
          const placeholder = `%%%CMD_PLACE_HOLDER_${index}%%%`;
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
        const title = processCommands(match[1], macros, placeholders, () => placeholderCounter++);
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
  const textWithCommands = processCommands(fullText, macros, placeholders, () => placeholderCounter++);

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

/**
 * コマンドの処理
 */
function processCommands(
  text: string, 
  macros: MacroDef[], 
  placeholders: { [key: string]: string },
  getCounter: () => number
): string {
  let currentText = text;
  
  // 0. 数式 (Math) と ソースコードの保護
  // Markdown変換前にプレースホルダー化して「そのまま」保存する
  const shouldPlaceholders = [
    // ブロック数式: $$ ... $$ または \[ ... \]
    /((\$\$|\\\[)([\s\S]*?)(\$\$|\\\]))/g,
    // コードブロック: #cd 言語 ... !#cd
    /((#cd\s)([\s\S]*?)(!#cd))/g,
    // インライン数式: $ ... $ または \( ... \)
    /((\$|\\\()([\s\S]*?)(\$|\\\)))/g,
    // インラインコード: `...`
    /((`)([\s\S]*?)(`))/g,
  ];
  // 上のものから優先的に置き換える ($$ABC$$ が $__XYZ__$ になるのを防ぐ)
  for (let iregex = 0; iregex < shouldPlaceholders.length; iregex++) {
    const regex = shouldPlaceholders[iregex];
    currentText = currentText.replace(regex, (match) => {
        const key = `%%%CMD_PLACE_HOLDER_${getCounter()}%%%`;
        placeholders[key] = match;
        return key;
    });
  }
  
  
  // 1. マクロ(\defされた自作コマンド)展開
  currentText = expandMacros(currentText, macros);

  // 2. @色名{text} に色を付ける
  for(const colorName in NAMED_COLORS) {
    const regexRed = new RegExp(`${colorName}([^}]*)\}`, 'g');
    currentText = currentText.replace(regexRed, (_, content) => {
      // 中身もMarkdownパースする
      const innerHtml = marked.parseInline(content, { async: false }) as string;
      const html = `<span style="color:red">${innerHtml}</span>`;
      
      const key = `%%%CMD_PLACE_HOLDER_${getCounter()}%%%`;
      placeholders[key] = html;
      return key;
    });
  }

  // 3. @img
  const regexImg = /@img\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
  currentText = currentText.replace(regexImg, (_, src, alt, w, h) => {
    const widthAttr = w === '*' ? '' : `width="${w}"`;
    const heightAttr = h === '*' ? '' : `height="${h}"`;
    const html = `<img src="${src}" alt="${alt}" ${widthAttr} ${heightAttr} style="max-width:100%; vertical-align:middle;" />`;
    
    const key = `%%%CMD_PLACE_HOLDER_${getCounter()}%%%`;
    placeholders[key] = html;
    return key;
  });

  return currentText;
}
/**
 * プレースホルダーを再帰的に復元する関数
 */
function restorePlaceholders(html: string, placeholders: { [key: string]: string }): string {
    let result = html;
    let hasMatch = true;
    let loopLimit = 1000; // 無限ループ防止

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