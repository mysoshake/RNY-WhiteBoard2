// tc/main.ts
import { simpleHash, obfuscateAnswer } from '../core/cryption';
import '../style.css';

// 生成するHTMLのテンプレート関数
function generateStudentHTML(problemText: string, correctHash: string, encryptedText: string, scriptUrl: string): string
{
    // ヒアドキュメントでHTMLを構築
    // 生徒側のHTML構造は st/main.ts が期待するIDと一致させる必要があります
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>問題演習</title>
    <style>
        body { font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; padding: 20px; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; text-align: left; }
        .problem-box { border: 2px solid #333; padding: 20px; margin-bottom: 20px; border-radius: 8px; background-color: #f9f9f9; }
        .input-area { margin-top: 20px; padding: 20px; background-color: #eee; border-radius: 8px; }
        input[type="text"] { padding: 10px; width: 60%; font-size: 16px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #007bff; color: white; border: none; border-radius: 4px; }
        button:hover { background-color: #0056b3; }
        #result { margin-top: 20px; font-weight: bold; font-size: 18px; min-height: 1.5em; }
    </style>
</head>
<body>
    <div class="container">
        <h2>演習問題</h2>
        
        <div class="problem-box">
            <p>${problemText.replace(/\n/g, '<br>')}</p>
        </div>

        <div class="input-area">
            <input type="text" id="answerInput" placeholder="回答を入力してください">
            <button id="checkButton">回答する</button>
            <div id="result"></div>
        </div>
    </div>

    <script>
        // 教員ツールによって生成されたデータ
        window.QUIZ_DATA = {
            correctHash: "${correctHash}",
            encryptedText: "${encryptedText}"
        };
    </script>

    <script src="${scriptUrl}"></script>
</body>
</html>`;
}

// 教員用画面の構築
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
    <h1>教員用：問題作成ツール</h1>
    
    <div style="margin-bottom: 1rem;">
      <label style="display:block; font-weight:bold;">1. 問題文</label>
      <textarea id="tc-problem" rows="4" style="width:100%; padding:0.5rem;"></textarea>
    </div>

    <div style="margin-bottom: 1rem;">
      <label style="display:block; font-weight:bold;">2. 正解 (完全一致判定)</label>
      <input type="text" id="tc-answer" style="width:100%; padding:0.5rem;">
    </div>

    <div style="margin-bottom: 1rem;">
        <label style="display:block; font-weight:bold;">3. ロジックファイルのURL (GitHub Pages等)</label>
        <input type="text" id="tc-script-url" value="https://example.github.io/student-logic.js" style="width:100%; padding:0.5rem; color:#666;">
        <small>※ GitHubへアップロードしたJSファイルのURLを指定してください</small>
    </div>

    <button id="tc-generate" style="padding:1rem 2rem; font-size:1.2rem; cursor:pointer;">
      生徒用HTMLをダウンロード
    </button>
  </div>
`;

// イベントリスナーの設定
const generateBtn = document.getElementById('tc-generate') as HTMLButtonElement;
const problemInput = document.getElementById('tc-problem') as HTMLTextAreaElement;
const answerInput = document.getElementById('tc-answer') as HTMLInputElement;
const urlInput = document.getElementById('tc-script-url') as HTMLInputElement;

generateBtn.addEventListener('click', () => 
{
    const problem = problemInput.value;
    const answer = answerInput.value;
    const url = urlInput.value;

    if (!problem || !answer)
    {
        alert("問題文と正解を入力してください。");
        return;
    }

    // 1. 正解からハッシュ値を計算 (判定用)
    const hash = simpleHash(answer);

    // 2. 正解を難読化 (表示用)
    const encrypted = obfuscateAnswer(answer);

    // 3. HTML文字列を生成
    const fileContent = generateStudentHTML(problem, hash, encrypted, url);

    // 4. ダウンロード処理
    const blob = new Blob([fileContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `problem_${Date.now()}.html`; // ファイル名にタイムスタンプ付与
    link.click();
    
    // メモリ解放
    URL.revokeObjectURL(link.href);
});