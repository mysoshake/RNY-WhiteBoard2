// ./src/app/parser.ts

import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { MacroDef, ParseResult, PlaceHolder, ProblemItem } from '../lib/core/type';
import Problem from './component/Problem';
import { expandMacros, extractMacros } from '../lib/preprocess/macro';
import { NAMED_COLORS } from '../lib/core/colornames';
import Essay from './component/Essay';
import { marked } from 'marked';
import { putLogApp } from '../lib/core/logger';
import SourceCode from './component/SourceCode';

/**
* 独自マークダウン( + 通常のMD)を解析し、HTMLソースコードを生成する
* 
* 流れ
* ①プリプロセスを実施（\defによって自作のインライン命令を追加）
* ②インライン命令(@～{...}のやつ)を書き換え（HTMLを覚えておいてプレースホルダー化）
* ③ボックス命令(#～ ... のやつ)を書き換え（HTMLを配置）
* ④プレースホルダーたちを復元
*/
export function parseMarkdown(markdown: string): ParseResult {
  
  let placeholders: PlaceHolder = {}; 
  let placeholderCounter = 0;

  let currentText = markdown;
  // [1] プリプロセス
  // [1-1] 数式 (MathJax) の保護
  // Markdown変換前にプレースホルダー化して保護
  const shouldPlaceholders = [
    // ブロック数式: $$ ... $$ または \[ ... \]
    /((\$\$|\\\[)([\s\S]*?)(\$\$|\\\]))/g,
    // インライン数式: $ ... $ または \( ... \)
    /((\$|\\\()([\s\S]*?)(\$|\\\)))/g,
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
  
  // [1-2] マクロの読み出し
  // マクロの定義(\def ... )を切り出して記憶
  // /def{@...}{} は消える
  const {cleanedText , macros } = extractMacros(currentText);
  currentText = cleanedText;
  const userMacros = macros;

  // [1-3] 画像ルートディレクトリ (\src) の解析
  let imgRootPath = "";
  // [1-3-a] \src{...} を検索してパスを取得
  const srcMatch = currentText.match(/\\src\{([^}]*)\}/);
  if (srcMatch) {
    imgRootPath = srcMatch[1];
    // パスの末尾にスラッシュがなければ追加する
    if (imgRootPath && !imgRootPath.endsWith('/') && !imgRootPath.endsWith('\\')) {
        imgRootPath += '/';
    }
    currentText = currentText.replace(/\\src\{[^}]*\}/g, '');
  }
  // [1-3-b] タイトル抽出
  let documentTitle = "授業資料"; // タイトル用変数
  const titleMatch = currentText.match(/\\title\{([^}]*)\}/);
  if (titleMatch) {
    documentTitle = titleMatch[1];
    currentText = currentText.replace(/\\title\{[^}]*\}/g, '');
  }
  
  // [2] インライン命令を処理
  
  // [2-1] 既存のインライン命令を生成
  /** プレースホルダーのindexを生成 */
  const getCounter: (() => number) = () => {
    return placeholderCounter++;
  };
  const inlineMacros: MacroDef[] = [];
  
  // [2-1-a] @色名{text} に色を付けるコマンド
  for(const colorName of NAMED_COLORS) {
    const name = colorName;
    const argCount = 1;
    const template = `<span style="color:${colorName}">$1</span>`;
    inlineMacros.push({ name, argCount, template });
  }

  // [2-1-b] @img{リンク}{alt}{幅}{高}
  inlineMacros.push({
    name: `img`,
    argCount: 4,
    template: `<img src=${imgRootPath}"$1" alt="$2" width=$3 height=$4 style="max-width:100%; vertical-align:middle;" />`
  });
  
  // [2-2] インライン命令を展開
  // 自作のマクロ(\defされた自作コマンド)を展開
  userMacros.push(...inlineMacros);
  currentText = expandMacros(currentText, userMacros, getCounter, placeholders);
  
  // [3] ボックス命令
  // それぞれの行ごとに解析
  const lines = currentText.split('\n');
  /** それぞれの翻訳後の行 */
  let processedLines: string[] = []; 
  const boxTypes = [
    '#ex', // 説明
    '#eg', // 例題
    '#pr', // 練習
    '#pb', // 問題
    '#es', // 考察
    '#as', // 課題
    '#cd', // ソースコード
  ];
  
  let isInBox: boolean = false;
  let shouldCloseBox: boolean = false;
  let shouldOpenBox: boolean = false;
  let prevBoxType: string = "";
  let nextBoxType: string = "";
  let boxBuffers: string[] = [];

  const problemData: ProblemItem[] = [];
  let boxPlaceholderCounter = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    shouldCloseBox = false;
    shouldOpenBox = false;
    let boxHead: string | null = null;
    
    // [3-1] ボックス書き換えの確認
    // boxOpen(ボックス始まり(#ex, #pr ... ))か
    boxTypes.forEach((box) => {
      const regex = new RegExp(`^${box}\\s+(.*)`);
      const match = line.match(regex);
      if(match) {
        nextBoxType = box;
        boxHead = match[1]; // #～ (この部分)
        shouldOpenBox = true;
      }
    });
    // boxClose(ボックス閉じ)か
    shouldCloseBox = line.startsWith("!#");
    if (isInBox && shouldOpenBox) {
      shouldCloseBox = true;
    }
    
    // [3-2] html生成
    // [3-2-a] 何でもない行ならそのまま
    if (!shouldOpenBox && !shouldCloseBox) {
      if (isInBox) {
        boxBuffers.push(line); // box内の文
      }
      else {
        processedLines.push(line); // 地の文
      }
    }
    // [3-2-b] ボックスの開閉処理
    else {
      // ボックス内で閉じ処理が必要
      if (shouldCloseBox && isInBox) {
        const optionLine: string = lines[i] + "";
        const hasOptions = optionLine.startsWith("!#");
        const options = !hasOptions ? [] : optionLine
          .substring(3)
          .split('|')
          .map(a => a.trim())
          .filter(a => a);
        if (hasOptions) putLogApp("system", "オプション:", options);
        
        switch (prevBoxType) {
          case "#pb": {
            const index = boxPlaceholderCounter++;
            const answers = options;
            const hashAnswers = answers.map(a => simpleHash(a));
            const encAnswer = obfuscateAnswer(answers[0] || "");
            putLogApp("debug", "答えのリスト", answers);
            problemData.push({
              mode: 'quiz',
              correctHashes: hashAnswers,
              encryptedText: encAnswer
            });

            const htmlBlock = Problem(index, boxBuffers.join(' <br>\n'));
            const placeholder = `%%%CMD_PLACE_HOLDER_${index}%%%`;
            placeholders[placeholder] = htmlBlock;
            processedLines.push(placeholder);
            putLogApp("debug", "PB オプション:", ...options);
            break;
          }
          case '#es': {
            const index = boxPlaceholderCounter++;
            const rowsNum: number | undefined = Number.isInteger(options[0]) ? parseInt(options[0]) : undefined;
            problemData.push({
              mode: 'essay',
              correctHashes: [],
              encryptedText: ''
            });
            
            const htmlBlock = Essay(index, boxBuffers.join(' <br>\n'), rowsNum || 6);
            const placeholder = `%%%CMD_PLACE_HOLDER_${index}%%%`;
            placeholders[placeholder] = htmlBlock;
            processedLines.push(placeholder);
            putLogApp("debug", "ES オプション:", ...options);
            break;
          }
          case "#cd": {
            const index = boxPlaceholderCounter++;
            const title = options[0] + "";
            const language = options[1] + "";
            putLogApp("debug", `コードブロック${title}[${language}]`);
            const htmlBlock = SourceCode(title, language, boxBuffers.join(' \n'));
            const placeholder = `%%%CMD_PLACE_HOLDER_${index}%%%`;
            placeholders[placeholder] = htmlBlock;
            processedLines.push(placeholder);
            putLogApp("debug", "PB オプション:", ...options);
            break;
          }
          case '#ex':
          case '#eg':
          case '#pr':
          case '#as':
          default:
            processedLines.push(...boxBuffers);
            break;
        }
        
        // 正常なbox閉じ処理
        boxBuffers = [];
        isInBox = false;
        processedLines.push(`</div>`);
      }
      else if (shouldCloseBox && !isInBox) {
          putLogApp('error', 'ボックス外で !# が使われました');
          processedLines.push(`<span style="color:red"> ボックス外で !# が使われました </span>`);
      }
      // ボックス開始
      if (shouldOpenBox) {
        processedLines.push(`<div class="box-common box-${nextBoxType.substring(1)}"><h2>${boxHead}</h2></div>
        <div class="box-container">`);
        boxBuffers = [];
        prevBoxType = nextBoxType;
        isInBox = true;
      }
    }
  }

  // ブロック外テキストのインライン処理
  const textWithCommands: string = processedLines.join("\n");
  let finalHtml = textWithCommands;
  finalHtml = marked.parse(textWithCommands, { async: false }) as string;
  finalHtml = restorePlaceholders(finalHtml, placeholders);

  Object.keys(placeholders).forEach(key => {
    finalHtml = finalHtml.split(`<p>${key}</p>`).join(placeholders[key]);
    finalHtml = finalHtml.split(key).join(placeholders[key]);
  });

  return {
    html: finalHtml,
    problemData: problemData, 
    title: documentTitle
  };
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