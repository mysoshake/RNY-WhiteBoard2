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

  const STORAGE_KEY_PREFIX_PROGRESS = 'rny_student_progress_';

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
    saveToStorage();
    
    // 開発者ツール用にも出力
    console.log(`[${log.timestamp}] [${type}] ${message}`, details || '');
  }
  
  // --- ストレージ保存 ---
  function saveToStorage(storageId: string = "") {
    try {
        localStorage.setItem(STORAGE_KEY_PREFIX_PROGRESS + storageId, JSON.stringify(progress));
    } catch (e) {
        console.warn("LocalStorage save failed", e);
    }
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
      // 重複チェック
      if (document.getElementById(`log-ans-${index}`)) return;
      
      // 問題文の取得 (DOMから無理やり取得して表示用に整形)
      // problem-container -> question-content 内のテキストを取得
      const problems = document.querySelectorAll('.problem-container');
      const targetContainer = problems[index];
      let questionSnippet = `Q:${index + 1}`;
      if (targetContainer) {
          const qContent = targetContainer.querySelector('.question-content');
          if (qContent && qContent.textContent) {
              // 長すぎる場合は省略
              questionSnippet = qContent.textContent.substring(0, 40) + (qContent.textContent.length > 40 ? '...' : '');
          }
      }

    const item = document.createElement('div');
    item.className = 'drawer-item';
    item.id = `log-ans-${index}`; // IDを付与して重複防止
    item.innerHTML = `
      <div class="drawer-item-q">${questionSnippet}</div>
      <div class="drawer-item-a">${answerText}</div>
    `;
    drawerList.appendChild(item);
    drawerList.scrollTop = drawerList.scrollHeight;
  }

  // --- 問題ロジック ---
  const containers = document.querySelectorAll('.problem-container');
  containers.forEach((container) => {
    const indexStr = container.getAttribute('data-index');
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    const data = problemList[index];

    const type = container.getAttribute('data-type');

    const input = container.querySelector('.student-input, .student-essay-input') as HTMLInputElement | HTMLTextAreaElement;
    const btn = container.querySelector('.check-btn') as HTMLButtonElement;
    const msg = container.querySelector('.result-msg') as HTMLSpanElement;

    if (!input || !btn || !msg) return;
    
    
    
  // 回答処理
  const handleAnswer = (val: string, isRestoreMode = false) => {
      if (type === 'essay') {
        if (!isRestoreMode && val.length === 0) {
          alert("内容を入力してください");
          return;
        }
        msg.innerHTML = `<span style="color:green">記録しました</span>`;
        input.disabled = true;
        btn.disabled = true;
        btn.textContent = "記録済み";

        if (!isRestoreMode) {
          progress.answers[index] = {
            userAnswer: val,
            isCorrect: true,
            timestamp: new Date().toISOString()
          };
          recordLog('answer', `Essay ${index + 1} submitted`);
          addAnswerToDrawer(index, "(記述済み)");
          updateGateVisibility();
          saveToStorage();
        }
        return;
      }

      // Quiz
      const hash = simpleHash(val);
      const isCorrect = data.correctHashes.indexOf(hash) !== -1;

      if (!isRestoreMode) {
          recordLog('answer', `Question ${index + 1} attempt`, { isCorrect });
      }

      if (isCorrect) {
        const ans = deobfuscateAnswer(data.encryptedText);
        msg.innerHTML = `<span style="color:blue">正解! (${ans})</span>`;
        input.disabled = true;
        btn.disabled = true;
        
        if (!isRestoreMode) {
          progress.answers[index] = {
            userAnswer: val,
            isCorrect: true,
            timestamp: new Date().toISOString()
          };
          addAnswerToDrawer(index, ans);
          updateGateVisibility();
          saveToStorage();
        }
      } else {
        msg.innerHTML = `<span style="color:red">不正解</span>`;
        if (!isRestoreMode) {
          progress.answers[index] = { userAnswer: val, isCorrect: false, timestamp: new Date().toISOString() };
          saveToStorage();
        }
      }
    };

    btn.addEventListener('click', () => {
      handleAnswer(input.value.trim());
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
  
// --- 復元処理 (Restore) ---
  function restoreProgress(storageId: string = "") {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX_PROGRESS + storageId);
    if (!saved) return;

    try {
      const savedData = JSON.parse(saved) as StudentProgress;
      
      // ID, Name復元
      progress.studentId = savedData.studentId || "";
      progress.name = savedData.name || "";
      if (idInput) idInput.value = progress.studentId;
      if (nameInput) nameInput.value = progress.name;

      // Logs復元
      if (Array.isArray(savedData.logs)) {
        progress.logs = savedData.logs;
      }

      // 回答状況の復元
      if (savedData.answers) {
        progress.answers = savedData.answers;
      
        Object.keys(savedData.answers).forEach((key) => {
          const idx = parseInt(key, 10);
          const ansData = savedData.answers[idx];
          if (!ansData || !ansData.isCorrect) return; // 正解のみUI復元

          // UI操作
          const container = document.querySelector(`.problem-container[data-index="${idx}"]`);
          if (container) {
            const input = container.querySelector('.essay-input-text, .essay-container') as HTMLInputElement;
            const btn = container.querySelector('.check-btn') as HTMLButtonElement;
            const msg = container.querySelector('.result-msg') as HTMLSpanElement;
            const type = container.getAttribute('data-type') || 'quiz';
            const problemData = problemList[idx];

            if (input && btn && msg) {
              input.value = ansData.userAnswer;
              input.disabled = true;
              btn.disabled = true;
              
              console.log("btn clicked");
              
              if (type === 'essay') {
                msg.innerHTML = `<span style="color:green">記録しました</span>`;
                btn.textContent = "記録済み";
                addAnswerToDrawer(idx, "(記述済み)");
              } else if (type === 'quiz') {
                const ansText = deobfuscateAnswer(problemData.encryptedText);
                msg.innerHTML = `<span style="color:blue">正解! (${ansText})</span>`;
                addAnswerToDrawer(idx, ansText);
              }
            }
          }
        });
      }
    } catch (e) {
      console.error("Restore failed", e);
    }
  }

  // 1. 復元
  restoreProgress();
  // 2. ゲート更新 (復元された状態に基づいて開閉)
  updateGateVisibility();
  
  // システムログ
  recordLog('system', 'System Loaded/Restored');
}

document.addEventListener('DOMContentLoaded', initStudentSystem);