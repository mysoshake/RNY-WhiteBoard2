// ./src/app/parser.ts

import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import { BoxType, type MacroDef, type ParseResult, type PlaceHolder, type ProblemItem } from '../lib/core/type';
import Problem from './component/Problem';
import { extractMacros, macrosToHtml } from '../lib/preprocess/macro';
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
  /** プレースホルダーのindexを生成 */
  const getPlaceholderCounter: (() => number) = () => {
    return placeholderCounter++;
  };

  let currentText = markdown;
  // [1] プリプロセス
  // [1-1] 数式 (MathJax) の保護
  // Markdown変換前にプレースホルダー化して保護
  const shouldPlaceholders = [
    // ブロック数式: $$ ... $$ または \[ ... \]
    /((\$\$|\\\[)([\s\S]*?)(\$\$|\\\]))/g,
    // インライン数式: $ ... $ または \( ... \)
    /((\$|\\\()([\s\S]*?)(\$|\\\)))/g,
    // // ブロックコード: #cd タイトル  \n  ...  \n  !# ファイル名.py | Python
    // /((#cd .*\n)([\s\S]*?)(!# .* $))/g,
    // インラインコード: ` ... ` または @code{python}{ ... }
    // /((`)([\s\S]*?)(`))/g,
  ];
  // 上のものから優先的に置き換える ($$ABC$$ が $__XYZ__$ になるのを防ぐ)
  for (let iregex = 0; iregex < shouldPlaceholders.length; iregex++) {
    const regex = shouldPlaceholders[iregex];
    currentText = currentText.replace(regex, (match) => {
      const index = getPlaceholderCounter();
      const key = `%%%CMD_PLACE_HOLDER_${index}%%%`;
      placeholders[key] = match;
      putLogApp('debug', "マッチ:", match);
      return key;
    });
  }
  putLogApp("debug", "事前に退避されたコマンド:", placeholders);
  
  // [1-2] マクロの読み出し
  // マクロの定義(\def ... )を切り出して記憶
  // /def{@...}[ 0 ]{ ... } は消える
  const { cleanedText , macros } = extractMacros(currentText);
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
  const inlineMacros: MacroDef[] = [];
  
  // [2-1-a] @色名{text} に色を付けるコマンド
  for(const colorName of NAMED_COLORS) {
    const name = colorName;
    const argCount = 1;
    const template = `<span style="color:${colorName}">\\{1}</span>`;
    inlineMacros.push({ name, argCount, template, keepContent:false });
  }

  // [2-1-b] @img{リンク}{alt}{幅}{高}
  inlineMacros.push({
    name: `img`,
    argCount: 4,
    template: `<img src="${imgRootPath}\\{1}" alt="\\{2}" width=\\{3} height=\\{4} style="max-width:100%; vertical-align:middle;" />`,
    keepContent: false
  });

  // [2-1-c] @code{言語名}{ ... }
  inlineMacros.push({
    name: `code`,
    argCount: 2,
    template: `<code class="code-inline" language="\\{1}">\\{2}</code>`,
    keepContent: true
  });
  
  let boxTypes: BoxType[] = [
    new BoxType('ex', ' ', "none", false),
    new BoxType('eg', ' ', "none", false),
    new BoxType('pr', ' ', "none", false),
    new BoxType('as', ' ', "none", false),
    new BoxType('pb', ' ', "hold", false),
    new BoxType('es', ' ', "hold", false),
    new BoxType('cd', ' ', "hold", true ),
  ];
  
  // [2-2] インライン命令を展開
  // 自作のマクロ(\defされた自作コマンド)を展開
  userMacros.push(...inlineMacros);
  putLogApp('debug', "マクロ適用前 : ", currentText);
  currentText = macrosToHtml(currentText, userMacros, getPlaceholderCounter, placeholders, boxTypes);
  putLogApp('debug', "マクロ適用後 : ", currentText);
  putLogApp('debug', "プレースホルダーたち : ", placeholders);
  
  // [3] ボックス命令
  // それぞれの行ごとに解析
  const lines = currentText.split('\n');
  /** それぞれの翻訳後の行 */
  let processedLines: string[] = []; 
  
  const problemData: ProblemItem[] = [];
  let problemCounter = 0;

  const PB_BOX: BoxType = new BoxType('pb', '問題', 'hold', false);
  PB_BOX.parser = (text) => {
    return macrosToHtml(text, macros, getPlaceholderCounter, placeholders, boxTypes);
  };
  PB_BOX.processContent = (lines, options) => {
    const pbIndex = problemCounter++;
    const answers = options;
    const hashAnswers = answers.map(a => simpleHash(a));
    const encAnswer = obfuscateAnswer(answers[0] || "");
    putLogApp("debug", "答えのリスト", answers);
    problemData.push({
      mode: 'problem',
      correctHashes: hashAnswers,
      encryptedText: encAnswer
    });
    const inlined = marked.parseInline(lines.join(' <br>\n'), { async: false });
    const htmlBlock = Problem(pbIndex, inlined);
    putLogApp("debug", "PB オプション:", ...options);
    return htmlBlock;
  };
  
  const ES_BOX = new BoxType('es', '考察', 'hold', false);
  ES_BOX.parser = (text) => {
    return macrosToHtml(text, macros, getPlaceholderCounter, placeholders, boxTypes);
  };
  ES_BOX.processContent = (lines, options) => {
    const pbIndex = problemCounter++;
    const rowsNum: number = +options[0];
    problemData.push({
      mode: 'essay',
      correctHashes: [],
      encryptedText: ''
    });
    const inlined = marked.parseInline(lines.join(' <br>\n'), { async: false });
    const htmlBlock = Essay(pbIndex, inlined, rowsNum || 6);
    putLogApp("debug", "ES オプション:", ...options);
    return htmlBlock;
  };
  
  const CD_BOX: BoxType = new BoxType('cd', 'プログラム', 'hold', true);
  CD_BOX.processContent = (lines, options) => {
    const title = options[0] + "";
    const language = options[1] + "";
    putLogApp('debug', "受け取ったlines: ", lines);
    const htmlBlock = SourceCode(title, language, lines.join(' \n'));
    putLogApp("debug", `コードブロック${title}[${language}]`);
    return htmlBlock;
  };
  
  boxTypes = [
    new BoxType('ex', '説明'),
    new BoxType('eg', '例題'),
    new BoxType('pr', '練習'),
    PB_BOX,
    ES_BOX,
    new BoxType('as', '課題'),
    CD_BOX
  ];

  let isInBox: boolean = false;
  let shouldCloseBox: boolean = false;
  let shouldOpenBox: boolean = false;
  let prevBoxType: BoxType | undefined = undefined;
  let nextBoxType: BoxType | undefined = undefined;
  let boxBuffers: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    shouldCloseBox = false;
    shouldOpenBox = false;
    let boxHead: string | null = null;
    
    // [3-1] ボックス書き換えの確認
    // boxOpen(ボックス始まり(#ex, #pr ... ))か
    boxTypes.forEach((box) => {
      const regex = new RegExp(`^${box.markSymbol}\\s+(.*)`);
      const match = line.match(regex);
      if(match) {
        nextBoxType = box as BoxType;
        boxHead = match[1]; // #XX [[ここ]]
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
        
        if (prevBoxType) {
          const closingBox: BoxType = prevBoxType as BoxType;
          if (closingBox.holdPlace) {
            const placeholderIndex = getPlaceholderCounter();
            const placeholder = `%%%CMD_PLACE_HOLDER_${placeholderIndex}%%%`;
            const htmlBlock = closingBox.processContent(boxBuffers, options)
            placeholders[placeholder] = htmlBlock;
            processedLines.push(placeholder);
            putLogApp("debug", `ボックス${closingBox.name}(holdPlace):`, htmlBlock);
          }
          else {
            const htmlBlock = closingBox.processContent(boxBuffers, options);
            processedLines.push(htmlBlock);
          }
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
      if (shouldOpenBox && nextBoxType) {
        putLogApp('debug', "Open BOX", boxHead);
        processedLines.push((nextBoxType as BoxType).createHeader(boxHead || ""));
        boxBuffers = [];
        prevBoxType = nextBoxType;
        isInBox = true;
      }
    }
  }

  // ブロック外テキストのインライン処理
  const textWithCommands: string = processedLines.join("\n");
  putLogApp("debug", "処理後のテキスト:", textWithCommands);
  let finalHtml = textWithCommands;
  finalHtml = macrosToHtml(finalHtml, macros, getPlaceholderCounter, placeholders, boxTypes);
  finalHtml = marked.parse(finalHtml, { async: false }) as string;
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