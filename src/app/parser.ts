// ./src/app/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { ParseResult, BoxParser } from '../lib/core/type';


// 独自マークダウンを解析し、HTMLと問題データを生成する
export function parseMarkdown(markdown: string): ParseResult {
  const quizData: ParseResult['quizData'] = [];
  let problemCounter = 0;
  
  const boxParsers: BoxParser[] = 
  [
    {
      prefix: "#ex", // 説明ボックス
      parse: (content: string) => {
        return (
          `<div class="box-ex">
            <h3>${content}</h3>
          </div>`);
      }
    },
    {
      prefix: "#pb", // 問題ボックス
      parse: (content: string) => {
        // #pb 問題文 | 正解1 | 正解2 | ...
        const separatorIndex = content.indexOf('|');
        if (separatorIndex === -1) return `エラー ${content}`;
        
        const questionText = content.substring(0, separatorIndex).trim();
        const answersPart = content.substring(separatorIndex + 1);
        
        // 解答パートをさらにパイプで分割して配列にする
        const answers = answersPart.split('|').map(a => a.trim()).filter(a => a.length > 0);
        
        if (answers.length > 0) {
            const index = problemCounter++;

            // データの保存
            quizData.push({
                // 全ての別解をハッシュ化して配列に保存
                correctHashes: answers.map(ans => simpleHash(ans)),
                // 最初の答えを表示用として難読化保存
                encryptedText: obfuscateAnswer(answers[0])
            });

            // HTML生成
            return `<div class="problem-container" data-index="${index}">
                      <p class="question-text">Q${index + 1}. ${questionText}</p>
                      <div class="input-area">
                        <input type="text" class="student-input" placeholder="回答を入力">
                        <button class="check-btn">判定</button>
                        <span class="result-msg"></span>
                      </div>
                    </div>`;
        }
        return `エラー ${content}`;
      }
    },
  ];
  
  // 1. 独自記法 (#pb, #ex) のプリプロセス
  // 行ごとに処理して、標準Markdownで処理できる形、またはHTMLプレースホルダーに置換する
  const lines = markdown.split('\n');
  const processedLines = lines.map(line => {
    for (const parser of boxParsers) {
      if (line.startsWith(parser.prefix)) {
        // 最初の '#pb 'を削る
        const content = line.substring(parser.prefix.length + 1);
        return parser.parse(content);
      }
      // その他の場合はそのまま
      return line;
    }
  });

  // 2. 標準Markdownの変換
  // marked は非同期の可能性もあるが基本は同期。型定義に従い同期的に使用。
  const rawHtml = marked.parse(processedLines.join('\n'), { async: false }) as string;
  return ({
    html: rawHtml,
    quizData: quizData
  });
}