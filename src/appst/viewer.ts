// ./src/appst/viewer.ts
import { simpleHash, deobfuscateAnswer } from "../lib/core/cryption";
import type { ProblemItem, StudentProgress, ActionLog } from "../lib/core/type";

declare global {
  interface Window {
    PROBLEM_DATA_LIST: ProblemItem[];
  }
}

function initStudentSystem() {
  const problemList = window.PROBLEM_DATA_LIST;
  if (!problemList) return;

  const progress: StudentProgress = {
    studentId: "",
    name: "",
    answers: {},
    logs: [],
    savedAt: ""
  };
  
  // ログ用関数
  function recordLog(type: ActionLog['type'], message: string, details?: any) {
    const log: ActionLog = {
        timestamp: new Date().toISOString(),
        type,
        message,
        details
    };
    
    // 内部データに保存
    progress.logs.push(log);
    
    // 開発者ツール用にも出力
    console.log(`[${log.timestamp}] [${type}] ${message}`, details || '');
  }
  
  recordLog('system', 'System Initialized', { problemCount: problemList.length });
  
  // --- ゲートシステム ---
  function updateGateVisibility() {
    const problems = document.querySelectorAll('.problem-container');
    let locked = false;

    problems.forEach((problemEl, index) => {
      const container = problemEl as HTMLElement;

      if (locked) {
        container.classList.add('is-locked');
        hideNextSiblings(container);
        return;
      }

      const isSolved = progress.answers[index]?.isCorrect === true;
      container.classList.remove('is-locked');

      if (!isSolved) {
        locked = true;
        hideNextSiblings(container);
      } else {
        showNextSiblings(container);
      }
    });

    const saveArea = document.getElementById('save-area');
    if (saveArea) {
      if (locked) saveArea.classList.add('is-locked');
      else saveArea.classList.remove('is-locked');
    }
  }
  
  function hideNextSiblings(el: HTMLElement) {
    let next = el.nextElementSibling as HTMLElement;
    while (next) {
      if (next.id !== 'save-area' && !next.classList.contains('app-footer')) {
         next.classList.add('is-locked');
      }
      next = next.nextElementSibling as HTMLElement;
    }
  }

  function showNextSiblings(el: HTMLElement) {
    let next = el.nextElementSibling as HTMLElement;
    while (next) {
      if (next.classList.contains('problem-container')) break;
      if (next.id === 'save-area') break;
      if (next.classList.contains('app-footer')) break;
      next.classList.remove('is-locked');
      next = next.nextElementSibling as HTMLElement;
    }
  }

  // --- ドロワー制御 (解答リスト) ---
  const drawer = document.getElementById('answer-drawer');
  const drawerToggle = document.getElementById('drawer-toggle');
  const drawerList = document.getElementById('drawer-list');

  // メニュー開閉
  if (drawerToggle && drawer) {
    drawerToggle.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      
      if (isOpen) {
          document.body.classList.add('drawer-open');
          drawerToggle.textContent = '▶ 閉じる';
      } else {
          document.body.classList.remove('drawer-open');
          drawerToggle.textContent = '◀ 解答';
      }
    });
  }

  // 解答リストへの追加処理
  function addAnswerToDrawer(index: number, answerText: string) {
      if (!drawerList) return;

      // 問題文の取得 (DOMから無理やり取得して表示用に整形)
      // problem-container -> question-content 内のテキストを取得
      const problems = document.querySelectorAll('.problem-container');
      const targetContainer = problems[index];
      let questionSnippet = `Q${index + 1}`;
      
      if (targetContainer) {
          const qContent = targetContainer.querySelector('.question-content');
          if (qContent && qContent.textContent) {
              // 長すぎる場合は省略
              questionSnippet = qContent.textContent.substring(0, 20) + (qContent.textContent.length > 20 ? '...' : '');
          }
      }

      const item = document.createElement('div');
      item.className = 'drawer-item';
      item.innerHTML = `
        <div class="drawer-item-q">${questionSnippet}</div>
        <div class="drawer-item-a">${answerText}</div>
      `;
      drawerList.appendChild(item);

      // 一番下にスクロール
      drawerList.scrollTop = drawerList.scrollHeight;
  }

  // --- 問題ロジック ---
  const containers = document.querySelectorAll('.problem-container');
  containers.forEach((container) => {
    const indexStr = container.getAttribute('data-index');
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    const data = problemList[index];

    const input = container.querySelector('.student-input') as HTMLInputElement;
    const btn = container.querySelector('.check-btn') as HTMLButtonElement;
    const msg = container.querySelector('.result-msg') as HTMLSpanElement;

    if (!input || !btn || !msg) return;

    btn.addEventListener('click', () => {
      const val = input.value.trim();
      const hash = simpleHash(val);
      // indexOf を使用 (古いブラウザ互換)
      const isCorrect = data.correctHashes.indexOf(hash) !== -1;
      
      recordLog('answer', `Question ${index + 1} attempt`, { 
          input: val, 
          isCorrect 
      });
      
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

        addAnswerToDrawer(index, ans);
        updateGateVisibility();
        
      } else {
        msg.innerHTML = `<span style="color:red">不正解</span>`;
        progress.answers[index] = {
            userAnswer: val,
            isCorrect: false,
            timestamp: new Date().toISOString()
        };
      }
    });
  });

  // --- JSON保存機能 ---
  const saveBtn = document.getElementById('save-btn');
  const idInput = document.getElementById('student-id') as HTMLInputElement;
  const nameInput = document.getElementById('student-name') as HTMLInputElement;

  if (saveBtn && idInput && nameInput) {
    saveBtn.addEventListener('click', () => {
      progress.studentId = idInput.value;
      progress.name = nameInput.value;
      progress.savedAt = new Date().toISOString();

      if (!progress.studentId || !progress.name) {
        alert("学籍番号と氏名を入力してください");
        recordLog('error', 'Save attempt failed: Missing ID or Name');
        return;
      }

      recordLog('system', 'Progress saved to JSON file');
      const jsonStr = JSON.stringify(progress, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${progress.studentId}_${progress.name}_progress.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
  
  // 初期ロード時実行
  updateGateVisibility();
}

document.addEventListener('DOMContentLoaded', initStudentSystem);