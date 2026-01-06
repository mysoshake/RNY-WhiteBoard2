// ./src/appst/viewer.ts
import { simpleHash, deobfuscateAnswer } from "../lib/core/cryption";
import type { ProblemItem, StudentProgress } from "../lib/core/type";


declare global {
  interface Window {
    QUIZ_DATA_LIST: ProblemItem[];
  }
}

function initStudentSystem() {
  const quizList = window.QUIZ_DATA_LIST;
  if (!quizList) return;

  // 進行状況管理
  const progress: StudentProgress = {
    studentId: "",
    name: "",
    answers: {},
    savedAt: ""
  };

  // 全ての問題コンテナを取得
  // HTML生成時に class="problem-container" data-index="0" のように付与されている前提
  const containers = document.querySelectorAll('.problem-container');

  containers.forEach((container) => {
    const indexStr = container.getAttribute('data-index');
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    const data = quizList[index];

    const input = container.querySelector('.student-input') as HTMLInputElement;
    const btn = container.querySelector('.check-btn') as HTMLButtonElement;
    const msg = container.querySelector('.result-msg') as HTMLSpanElement;

    if (!input || !btn || !msg) return;

    btn.addEventListener('click', () => {
      const val = input.value.trim();
      const hash = simpleHash(val);
      const isCorrect = (data.correctHashes.includes(hash));

      // 結果表示
      if (isCorrect) {
        const ans = deobfuscateAnswer(data.encryptedText);
        msg.innerHTML = `<span style="color:blue">正解! (${ans})</span>`;
        // 正解したら入力不可にするなどの制御も可能
        input.disabled = true;
        btn.disabled = true;
      } else {
        msg.innerHTML = `<span style="color:red">不正解</span>`;
      }

      // データ記録
      progress.answers[index] = {
        userAnswer: val,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
      };
    });
  });

  // --- JSON保存機能 ---
  const saveBtn = document.getElementById('save-btn');
  const idInput = document.getElementById('student-id') as HTMLInputElement;
  const nameInput = document.getElementById('student-name') as HTMLInputElement;

  if (saveBtn && idInput && nameInput) {
    saveBtn.addEventListener('click', () => {
      // ユーザー情報の更新
      progress.studentId = idInput.value;
      progress.name = nameInput.value;
      progress.savedAt = new Date().toISOString();

      if (!progress.studentId || !progress.name) {
        alert("学籍番号と氏名を入力してください");
        return;
      }

      // JSONファイル生成
      const jsonStr = JSON.stringify(progress, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      // ダウンロード発火
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      // ファイル名: 学籍番号_氏名.json
      link.download = `${progress.studentId}_${progress.name}_progress.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
}

document.addEventListener('DOMContentLoaded', initStudentSystem);