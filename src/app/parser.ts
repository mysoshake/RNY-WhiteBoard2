// ./src/app/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../lib/core/cryption';
import type { ParseResult } from '../lib/core/type';
// 追加: コンポーネント(関数)をインポート
import Problem from './component/Problem';

/**
 * 独自マークダウンを解析し、HTMLと問題データを生成する
 */
export function parseMarkdown(markdown: string): ParseResult {
  const quizData: ParseResult['quizData'] = [];
  const placeholders: { [key: string]: string } = {}; 
  let problemCounter = 0;

  const lines = markdown.split('\n');
  const processedLines: string[] = [];
  
  let inProblemBlock = false;
  let problemBodyBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- A. 複数行ブロックモード ---
    if (inProblemBlock) {
      if (line.trim() === '---') {
        const answerLine = lines[i + 1] || "";
        i++; 

        const index = problemCounter++;
        const answers = answerLine.split('|').map(a => a.trim()).filter(a => a);
        
        quizData.push({
            correctHashes: answers.map(a => simpleHash(a)),
            encryptedText: obfuscateAnswer(answers[0] || "")
        });

        const problemHtml = marked.parse(problemBodyBuffer.join('\n'), { async: false }) as string;

        // 変更: Problem関数を使用
        const htmlBlock = Problem(index, problemHtml);
        
        const placeholder = `[[__PROBLEM_BLOCK_${index}__]]`;
        placeholders[placeholder] = htmlBlock;
        processedLines.push(placeholder);

        inProblemBlock = false;
        problemBodyBuffer = [];
      } else {
        problemBodyBuffer.push(line);
      }
      continue;
    }

    // --- B. 新しいブロックの開始 ---
    if (line.trim() === '#pb') {
      inProblemBlock = true;
      problemBodyBuffer = [];
      continue;
    }

    if (line.startsWith('#pb ')) {
      const content = line.substring(4);
      const separatorIndex = content.indexOf('|');

      if (separatorIndex !== -1) {
        const questionMarkdown = content.substring(0, separatorIndex).trim();
        const answersPart = content.substring(separatorIndex + 1);
        const answers = answersPart.split('|').map(a => a.trim()).filter(a => a);

        if (answers.length > 0) {
           const index = problemCounter++;
           
           quizData.push({
               correctHashes: answers.map(a => simpleHash(a)),
               encryptedText: obfuscateAnswer(answers[0])
           });

           const questionHtml = marked.parse(questionMarkdown, { async: false }) as string;
           
           // 変更: Problem関数を使用
           const htmlBlock = Problem(index, questionHtml);

           const placeholder = `[[__PROBLEM_BLOCK_${index}__]]`;
           placeholders[placeholder] = htmlBlock;
           processedLines.push(placeholder);
           continue;
        }
      }
    }

    // --- C. #ex (説明) ---
    const exMatch = line.match(/^#ex\s+(.*)/);
    if (exMatch) {
      const title = exMatch[1];
      const exHtml = `<div class="box-ex"><h3>${title}</h3></div>`;
      processedLines.push(exHtml); 
      continue;
    }

    processedLines.push(line);
  }

  let finalHtml = marked.parse(processedLines.join('\n'), { async: false }) as string;

  Object.keys(placeholders).forEach(key => {
    finalHtml = finalHtml.replace(key, placeholders[key]);
    finalHtml = finalHtml.replace(`<p>${key}</p>`, placeholders[key]); 
  });

  return {
    html: finalHtml,
    quizData: quizData
  };
}