// tc/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../core/cryption';
import type { ParseResult } from '../core/type';


// 独自マークダウンを解析し、HTMLと問題データを生成する
export function parseMarkdown(markdown: string): ParseResult {
  const quizData: ParseResult['quizData'] = [];
  let problemCounter = 0;
  
  const boxParsers: BoxParser[] = [
    {
      prefix: "#ex"
    },
    {
      // --- #pb 問題文 | 正解1 | 正解2 | ... ---
      // 例: #pb 1+1は？ | 2 | ２ | 二
      prefix: "#pb",
      parse: (line: string) => {
      
      }
    },
  ];
  
  // 1. 独自記法 (#pb, #ex) のプリプロセス
  // 行ごとに処理して、標準Markdownで処理できる形、またはHTMLプレースホルダーに置換する
  const lines = markdown.split('\n');
  const processedLines = lines.map(line => {
    if(line.startsWith('#pb ')) {
      
      // 最初の '#pb 'を削る
      const content = line.substring(4);
      
      const 
      
      const pbMatch = line.match(/^#pb\s+(.*?)\s*[^\\]\|\s*(.*)/);
      if (pbMatch) {
        const questionText = pbMatch[1];
        const answerText = pbMatch[2].trim();
        const index = problemCounter++;

        // 正解データを保存
        quizData.push({
          correctHash: simpleHash(answerText),
          encryptedText: obfuscateAnswer(answerText)
        });

        // 生徒用HTMLに埋め込むタグを生成
        // data-index 属性を使って、後でJSから正解データと紐付ける
        return `<div class="problem-container" data-index="${index}">
              <p class="question-text">Q${index + 1}. ${questionText}</p>
              <div class="input-area">
              <input type="text" class="student-input" placeholder="回答を入力">
              <button class="check-btn">判定</button>
              <span class="result-msg"></span>
              </div>
            </div>`;
      }    }
    
    
    // --- #ex タイトル ---
    const exMatch = line.match(/^#ex\s+(.*)/);
    if (exMatch) {
      const title = exMatch[1];
      return `<div class="box-ex"><h3>${title}</h3></div>`; 
    }
    
    // その他の場合はそのまま
    return line;
  });

  // 2. 標準Markdownの変換
  // marked は非同期の可能性もあるが基本は同期。型定義に従い同期的に使用。
  const rawHtml = marked.parse(processedLines.join('\n'), { async: false }) as string;
  return ({
    html: rawHtml,
    quizData: quizData
  });
}