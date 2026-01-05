// tc/parser.ts

import { marked } from 'marked';
import { simpleHash, obfuscateAnswer } from '../core/cryption';

export interface ParseResult {
    html: string;
    quizData: {
        correctHash: string;
        encryptedText: string;
    }[];
}

/**
 * 独自マークダウンを解析し、HTMLと問題データを生成する
 */
export function parseMarkdown(markdown: string): ParseResult {
    const quizData: ParseResult['quizData'] = [];
    let problemCounter = 0;

    // 1. 独自記法 (#pb, #ex) のプリプロセス
    // 行ごとに処理して、標準Markdownで処理できる形、またはHTMLプレースホルダーに置換する
    const lines = markdown.split('\n');
    const processedLines = lines.map(line => {
        // --- #pb 問題文 | 正解1 | 正解2 ... ---
        // 例: #pb 1+1は？ | 2 | ２ | 二
        const pbMatch = line.match(/^#pb\s+(.*?)\s*[^\\]\|\s*(.*)/);
        if (pbMatch) {
            const questionText = pbMatch[1];
            const answerTexts = pbMatch[2].trim();
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
        }

        // --- #ex タイトル ---
        // 例: #ex 補足: 計算の順序
        const exMatch = line.match(/^#ex\s+(.*)/);
        if (exMatch) {
            const title = exMatch[1];
            return `<div class="example-box"><h3>${title}</h3>`; 
            // ※閉じタグ </div> はMarkdownのブロック終了判定が難しいため
            //   今回は簡易的に「次の #ex や #pb が来るまで」等の厳密な制御はせず、
            //   ユーザーにHTMLタグで閉じさせるか、CSSで見た目を整える方針とします。
            //   あるいは単純に「見出し付きのボックス」として1行で扱うなら以下：
        }
        
        return line;
    });

    // 2. 標準Markdownの変換
    // marked は非同期の可能性もあるが基本は同期。型定義に従い同期的に使用。
    const rawHtml = marked.parse(processedLines.join('\n'), { async: false }) as string;

    return {
        html: rawHtml,
        quizData: quizData
    };
}