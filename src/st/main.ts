// st/main.ts

import { simpleHash, deobfuscateAnswer } from "../core/cryption";

// HTML側に埋め込まれるデータの型定義
interface QuizData {
    correctHash: string;   // 正解のハッシュ値
    encryptedText: string; // 暗号化された答え
}

declare global {
    interface Window {
        QUIZ_DATA: QuizData;
    }
}

function initStudentSystem() {
    // IDは後で生成するHTMLと合わせる必要があります
    const input = document.getElementById('answerInput') as HTMLInputElement;
    const button = document.getElementById('checkButton') as HTMLButtonElement;
    const resultArea = document.getElementById('result') as HTMLDivElement;
    const data = window.QUIZ_DATA;

    if (!input || !button || !resultArea) {
        console.error("DOM要素が見つかりません");
        return;
    }

    if (!data) {
        resultArea.textContent = "エラー: 問題データが不正です";
        return;
    }

    button.addEventListener('click', () => {
        const userVal = input.value;
        const userHash = simpleHash(userVal);

        if (userHash === data.correctHash) {
            const realAnswer = deobfuscateAnswer(data.encryptedText);
            // 2016年頃のブラウザでも動く標準的なDOM操作
            resultArea.innerHTML = "正解です！ 答え: <b>" + realAnswer + "</b>";
            resultArea.style.color = "blue";
        } else {
            resultArea.textContent = "不正解です。";
            resultArea.style.color = "red";
        }
    });
}

// 読み込み完了後に実行
document.addEventListener('DOMContentLoaded', initStudentSystem);