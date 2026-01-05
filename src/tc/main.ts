// tc/main.ts
import { parseMarkdown } from './parser';
import '../style.css';

// テンプレート関数（生徒用HTML全体の骨組み）
function generateStudentHTML(bodyContent: string, quizData: any[], scriptUrl: string): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>授業資料</title>
    <style>
        body { font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; padding: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        
        /* #pb (問題) のスタイル */
        .problem-container { 
            border: 2px solid #007bff; padding: 15px; margin: 20px 0; 
            border-radius: 8px; background-color: #f0f8ff; 
        }
        .question-text { font-weight: bold; margin-top: 0; }
        .result-msg { margin-left: 10px; font-weight: bold; }
        
        /* #ex (例・補足) のスタイル (簡易実装) */
        h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        
        /* 制御用エリア */
        #save-area { 
            margin-top: 50px; padding: 20px; border-top: 1px solid #ccc; text-align: center; 
        }
        input, button { font-size: 1rem; padding: 5px 10px; }
    </style>
</head>
<body>
    <div class="container">
        ${bodyContent}

        <div id="save-area">
            <h3>学習の記録</h3>
            <label>学籍番号: <input type="text" id="student-id"></label>
            <label>氏名: <input type="text" id="student-name"></label>
            <button id="save-btn">学習データを保存する</button>
        </div>
    </div>

    <script>
        // 問題データ (配列として保持)
        window.QUIZ_DATA_LIST = ${JSON.stringify(quizData)};
    </script>
    <script src="${scriptUrl}"></script>
</body>
</html>`;
}

// 教員用画面UI
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="display: flex; height: 100vh; flex-direction: column;">
    <header style="padding: 10px; background: #eee; border-bottom: 1px solid #ccc;">
        <h1>授業資料作成ツール</h1>
        <button id="tc-download">HTML出力</button>
        <input type="text" id="tc-url" value="student-main.js" size="30" placeholder="JSファイルURL">
    </header>
    <div style="display: flex; flex: 1; overflow: hidden;">
        <div style="flex: 1; display: flex; flex-direction: column; border-right: 1px solid #ccc;">
            <div style="padding: 5px; background: #f9f9f9; font-size: 0.9em;">
                Markdown入力 (#pb 問題 | 答え)
            </div>
            <textarea id="tc-input" style="flex: 1; padding: 10px; resize: none; border: none; outline: none;"></textarea>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; background: #fff;">
             <div style="padding: 5px; background: #f9f9f9; font-size: 0.9em;">
                プレビュー
            </div>
            <div id="tc-preview" style="flex: 1; padding: 20px; overflow-y: auto;"></div>
        </div>
    </div>
  </div>
`;

// ロジック
const inputArea = document.getElementById('tc-input') as HTMLTextAreaElement;
const previewArea = document.getElementById('tc-preview') as HTMLDivElement;
const downloadBtn = document.getElementById('tc-download') as HTMLButtonElement;
const urlInput = document.getElementById('tc-url') as HTMLInputElement;

// 初期データ
inputArea.value = `# 第1回 イントロダクション

ようこそ。ここでは基本的な計算を学びます。

## 例題
#ex 計算の基本
1 + 1 は 2 です。

## 演習問題
以下の問題に答えてください。

#pb 10 + 20 は？ | 30
#pb "Hello" の意味は？ | こんにちは
`;

// 入力イベントでプレビュー更新
inputArea.addEventListener('input', () => {
    const result = parseMarkdown(inputArea.value);
    previewArea.innerHTML = result.html;
});

// 初回実行
previewArea.innerHTML = parseMarkdown(inputArea.value).html;

// ダウンロード処理
downloadBtn.addEventListener('click', () => {
    const result = parseMarkdown(inputArea.value);
    const html = generateStudentHTML(result.html, result.quizData, urlInput.value);
    
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lecture_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
});