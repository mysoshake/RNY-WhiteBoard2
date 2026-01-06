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
  
  // ゲートシステム: 表示制御ロジック
  function updateGateVisibility() {
    const problems = document.querySelectorAll('.problem-container');
    let locked = false;

    problems.forEach((problemEl, index) => {
      const container = problemEl as HTMLElement;

      // すでにロックモードなら、この問題自体も隠す
      if (locked) {
        container.classList.add('is-locked');
        hideNextSiblings(container);
        return;
      }

      // 正解済みかチェック
      const isSolved = progress.answers[index]?.isCorrect === true;

      // この問題までは表示
      container.classList.remove('is-locked');

      if (!isSolved) {
        // 未解決の場合: ロック有効化。この問題より「後ろ」の要素を全て隠す
        locked = true;
        hideNextSiblings(container);
      } else {
        // 解決済みの場合: 次の要素を表示（次の問題の手前まで）
        showNextSiblings(container);
      }
    });

    // 保存エリアの制御
    const saveArea = document.getElementById('save-area');
    if (saveArea) {
      if (locked) saveArea.classList.add('is-locked');
      else saveArea.classList.remove('is-locked');
    }
  }
  
  // 要素より後ろにある兄弟要素をすべて隠す
  function hideNextSiblings(el: HTMLElement) {
    let next = el.nextElementSibling as HTMLElement;
    while (next) {
      if (next.id !== 'save-area') next.classList.add('is-locked');
      next = next.nextElementSibling as HTMLElement;
    }
  }

  // 要素より後ろにある兄弟要素を表示する（次の問題まで）
  function showNextSiblings(el: HTMLElement) {
    let next = el.nextElementSibling as HTMLElement;
    while (next) {
      if (next.classList.contains('problem-container')) break; // 次の問題でストップ
      if (next.id === 'save-area') break; // 保存エリアでストップ
      next.classList.remove('is-locked');
      next = next.nextElementSibling as HTMLElement;
    }
  }
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

      // 正誤判定
      if (isCorrect) {
        const ans = deobfuscateAnswer(data.encryptedText);
        msg.innerHTML = `<span style="color:blue">正解! (${ans})</span>`;

        input.disabled = true;
        btn.disabled = true;
        progress.answers[index] = {
          userAnswer: val,
          isCorrect: true,
          timestamp: new Date().toISOString()
        };
        updateGateVisibility();
        
      } else {
        msg.innerHTML = `<span style="color:red">不正解</span>`;
        // 不正解も記録
        progress.answers[index] = {
            userAnswer: val,
            isCorrect: false,
            timestamp: new Date().toISOString()
        };
      }

      // データ記録
      progress.answers[index] = {
        userAnswer: val,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
      };
    });
  });

  // JSON保存機能
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
  
  updateGateVisibility();
}

document.addEventListener('DOMContentLoaded', initStudentSystem);