// ./src/appst/viewer.ts
import { IS_DEBUG_MODE } from "../lib/core/constant";
import { simpleHash, deobfuscateAnswer } from "../lib/core/cryption";
import { logger } from "../lib/core/logger";
import type { ProblemItem, StudentProgress, ActionLog, QuickProgress, ProblemAnswer, EssayAnswer } from "../lib/core/type";

declare global {
  interface Window {
    PROBLEM_DATA_LIST: ProblemItem[];
    LECTURE_TITLE: string;
  }
}

function initStudentSystem() {
  // ========　定数たちの定義　========
  const problemList = window.PROBLEM_DATA_LIST;
  if (!problemList) return;

// タイトルを取得 (なければ default)
  const lectureTitle = window.LECTURE_TITLE || "default";
  
  // キーに使用できない文字を除去したりエンコードしたりして安全な文字列にする
  // (簡易的に英数字とハイフンアンダーバー以外を置換する例、あるいはそのまま使う)
  const safeTitle = lectureTitle.replace(/[\s\/:*?"<>|]/g, "_");

  // キーにタイトルを含める
  const STORAGE_KEY_PROGRESS = `rny_student_progress_${safeTitle}`;  
  const progress: StudentProgress = {
    studentId: "",
    name: "",
    answers: {},
    logs: [],
    savedAt: ""
  };
  
  // --- 解答リスト ---
  const drawer = document.getElementById('answer-drawer');
  const drawerToggle = document.getElementById('drawer-toggle');
  const drawerList = document.getElementById('drawer-list');

  // --- JSON保存機能 ---
  const saveBtn = document.getElementById('save-btn');
  const idInput = document.getElementById('student-id') as HTMLInputElement;
  const nameInput = document.getElementById('student-name') as HTMLInputElement;

  // 進捗表示用
  const progressFloat = document.createElement('div');
  progressFloat.className = 'progress-float';
  document.body.appendChild(progressFloat);
  
  // ========　関数たちの定義　=========

  /**
  * ログ用関数
  */
  function putLog(type: ActionLog['type'], shouldRecord: boolean, message: string, details?: any) {
    const log: ActionLog = {
        timestamp: new Date().toISOString(),
        type,
        message,
        details
    };
    
    // 開発者ツール用にも出力
    // デバッグモードなら debug タイプも
    if (type !== "debug" || IS_DEBUG_MODE) {
      logger(log);
    }
    
    if (shouldRecord) {
      progress.logs.push(log);
    }
  }
  
  /**
  * --- JSONファイルをチェック者用に整形 ---
  */
  function formatJSON(progress: StudentProgress): QuickProgress {
    putLog("debug", false, "CALL::formatJSON()");
    const answers = Object.values(progress.answers);
    
    let problem_answers: ProblemAnswer[] = [];
    let essay_answers: EssayAnswer[] = [];
    
    let problemCount = 0;
    let correctCount = 0;
    let skipCount = 0;
    
    for (let ians = 0; ians < answers.length; ians++) {
      const anAnswer = progress.answers[ians];
      switch(anAnswer.type) {
        case 'essay':
        {
          const quickAnswer: EssayAnswer = { index: ians, userAnswer: anAnswer.userAnswer };
          essay_answers.push(quickAnswer);
          break;
        }
        case 'problem':
        {
          problemCount++;
          if (anAnswer.isCorrect) correctCount++;
          else if (anAnswer.isSkipped) skipCount++;
          
          const statusText = !anAnswer.isSkipped ? (anAnswer.isCorrect ? 'o' : 'x') : '-';
          const quickAnswer: ProblemAnswer = { index: ians, status: statusText, userAnswer: anAnswer.userAnswer };
          problem_answers.push(quickAnswer);
          break;
        }
        default:
        {
          break;
        }
      }
    }
    const overviewText = `正解数: ${correctCount} / 問題数: ${problemCount} (スキップ: ${skipCount})`;
    let formattedProgress: QuickProgress = {
      studentId: progress.studentId,
      name: progress.name,
      overview: overviewText,
      pb_answers: problem_answers,
      es_answers: essay_answers,
    };
    return formattedProgress;
  }
  
  /**
  * --- ストレージ保存 ---
  */
  function saveToStorage() {
    try {
      putLog("debug", false, "CALL::saveToStorage()");
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.warn("LocalStorage save failed", e);
    }
  }
    
  /** 
  * --- 復元処理 (Restore) ---
  */
  function restoreProgress() {
    putLog("system", false, "CALL::restoreProgress()");
    const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
    putLog("debug", false, "データ復元中...");
    if (!saved) {
      putLog("info", false, "保存されたデータ：なし");
      return;
    }
      
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
        putLog("system", true, "ログを復元", ...progress.logs);
      }
      
      if(!savedData.answers) {
        putLog("info", false, "答えのデータ：なし");
      }
      
      // 回答状況の復元
      if (savedData.answers) {
        progress.answers = savedData.answers;
        putLog("info", false, "回答状況の復元:", savedData.answers);
        
        Object.keys(savedData.answers).forEach((key) => {
          const idx = parseInt(key, 10);
          const ansData = savedData.answers[idx];
          if (!ansData || !(ansData.isCorrect || ansData.isSkipped)) return; // 正解とスキップのみUI復元

          // UI操作
          const container = document.querySelector(`.problem-container[data-index="${idx}"]`);
          if (container) {
            // student-input: クイズ用, essay-input-text: エッセイ用
            const input = container.querySelector('.student-input, .essay-student-input') as HTMLInputElement | HTMLTextAreaElement;
            const btn = container.querySelector('.check-btn, .essay-submit-btn') as HTMLButtonElement;
            const msg = container.querySelector('.result-msg') as HTMLSpanElement;
            const type = container.getAttribute('data-type') || 'problem';
            const problemData = problemList[idx];
            
            if (!input || !btn || !msg) {
              if(!input) console.error("input(.student-input, .essay-student-input) が見つかりません");
              if(!btn) console.error("btn(.check-btn, .essay-submit-btn) が見つかりません");
              if(!msg) console.error("msg(.result-msg) が見つかりません");
            }

            if (input && btn && msg) {
              input.value = ansData.userAnswer;
              input.disabled = true;
              btn.disabled = true;
              
              if (type === 'essay') {
                // エッセイは編集可能にしておく
                msg.innerHTML = `<span style="color:green">保存済み</span>`;
                btn.textContent = "保存済み";
                input.disabled = false; 
                btn.disabled = false;
                addAnswerToDrawer(idx, "(記述済み)");
              } else if (type === 'problem') {
                // クイズはロック
                const ansText = deobfuscateAnswer(problemData.encryptedText);
                // 正解なら
                if (ansData.isCorrect) {
                  msg.innerHTML = `<span style="color:blue">正解! (${ansText})</span>`;
                }
                else {
                  msg.innerHTML = `<span style="color:orange">(スキップ)</span>`;
                }
                input.disabled = true;
                btn.disabled = true;
                addAnswerToDrawer(idx, ansText);
              }
            }
          }
        });
      }
    } catch (e) {
      
      putLog("error", false, "Restore failed", e);
    }
  }


  /**
  * 進捗表示を更新する関数
  */
  function updateProgressDisplay() {
    const total = problemList.length;
    // 正解(isCorrect) または スキップ(isSkipped) された数をカウント
    const completed = Object.values(progress.answers).filter(
        a => a && (a.isCorrect || a.isSkipped)
    ).length;

    progressFloat.textContent = `完了: ${completed} / ${total}`;
    
    // 全問完了したら色を変えるなどの演出も可能
    if (completed === total) {
        progressFloat.style.backgroundColor = "rgba(40, 167, 69, 0.9)"; // 緑色
        progressFloat.textContent += " (All Clear!)";
    }
  }
  
  /**
  * --- ゲートシステム ---
  * コンテンツ内の全要素を走査し、未回答問題より後ろをすべて非表示にする
  */
  function updateGateVisibility() {
    putLog("debug", false, "CALL::updateGateVisibility()")
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      putLog("error", true, " #main-content が見つかりません")
      return;
    }

    // main-content直下の要素をすべて取得
    const elements = Array.from(mainContent.children) as HTMLElement[];
    
    let isGateOpen = true; // ゲートが開いているか（表示してよいか）
    let allGateOpen = true;
    elements.forEach((el) => {
      putLog("debug", false, "要素:", el)
      
      // 子孫に問題コンテナを含んでいたら取り出す
      const problemElem: Element | null = el.querySelector('.problem-container');
      
      // 保存エリアとフッターは別扱い（最後に判定）
      if (el.id === 'save-area' || el.classList.contains('app-footer')) {
        putLog("debug", false, "この要素は save-area または app-footer", el)
        return;
      }

      if (!isGateOpen) {
        // ゲートが閉じた後はすべて非表示
        el.classList.add('is-locked');
        return;
      }
      else {
        // ゲートが開いているなら表示
        el.classList.remove('is-locked');
      }
      
      // 問題コンテナに出くわしたら、正解済みかチェック
      if (problemElem) {
        const indexStr = problemElem.getAttribute('data-index');
        if (indexStr !== null) {
          putLog("debug", false, `問題番号${indexStr}`);
          const index = parseInt(indexStr, 10);
          const ans = progress.answers[index];
          const isSolved = (ans?.isCorrect === true) || (ans?.isSkipped === true);
          
          if (!isSolved) {
            isGateOpen = false;
            allGateOpen = false;
          }
        }
        else {
          putLog("debug", false, "問題の indexStr が null");
        }
      }
    });

    const statusMsg = document.getElementById('status-msg');
    if (statusMsg) {
      statusMsg.innerHTML = "続きがあります";
      if (allGateOpen) {
        statusMsg.innerHTML = "資料は終わりです";
      }
    }
    
    // 保存エリアの制御: 全ての問題が解かれていなくても表示
    const saveArea = document.getElementById('save-area');
    if (saveArea) {
      saveArea.classList.remove('is-locked');
    }
    
    
  }

  /**
  * 解答リストへの追加処理
  */
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
    if (item) {
      item.className = 'drawer-item';
      item.id = `log-ans-${index}`; // IDを付与して重複防止
      item.innerHTML = `
        <div class="drawer-item-q">${questionSnippet}</div>
        <div class="drawer-item-a">${answerText}</div>
      `;
      drawerList.appendChild(item);
    }
    drawerList.scrollTop = drawerList.scrollHeight;
  }

  // ========　ここから処理　=========


  // 復元
  restoreProgress();

  putLog('system', true, 'Logging System Initialized', { problemCount: problemList.length });

  // --- ドロワー制御 (解答リスト) ---
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

  // --- 隠し機能: 7回クリックでリセット ---
  let clickCount = 0;
  let clickTimer: any;
  progressFloat.addEventListener('click', () => {
    clickCount++;
    
    // 連打が途切れたらカウンタをリセット (2秒)
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

    if (clickCount >= 7) {
      if (confirm("【管理者機能】\n学習履歴（進捗データ）を削除しますか？\nページはリロードされます。")) {
        // 保存されているデータを削除
        localStorage.removeItem(STORAGE_KEY_PROGRESS);
        alert("削除しました。");
        location.reload();
      }
      clickCount = 0; // キャンセルされた場合もカウントはリセット
    }
  });


  // --- 問題ロジック ---
  const containers = document.querySelectorAll('.problem-container');
  containers.forEach((container) => {
    const indexStr = container.getAttribute('data-index');
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    const data = problemList[index];

    const type = container.getAttribute('data-type');

    const input = container.querySelector('.student-input, .essay-student-input') as HTMLInputElement | HTMLTextAreaElement;
    const btn = container.querySelector('.check-btn, .essay-submit-btn') as HTMLButtonElement;
    const msg = container.querySelector('.result-msg') as HTMLSpanElement;
    const skipBtn = container.querySelector('.skip-btn') as HTMLButtonElement;

    if (!input || !btn || !msg) {
      if(!input) console.error("input(.student-input, .essay-student-input) が見つかりません");
      if(!btn) console.error("btn(.check-btn, .essay-submit-btn) が見つかりません");
      if(!msg) console.error("msg(.result-msg) が見つかりません");
      return;
    }
    
    // 考察(es)が未保存かどうか
    if (type === 'essay') {
        input.addEventListener('input', () => {
            // 内容が変わったらボタンを有効化＆見た目変更
            btn.disabled = false;
            btn.textContent = "保存する（未保存）";
            btn.style.backgroundColor = "#d9534f";
            msg.innerHTML = ""; // メッセージクリア
        });
    }
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (!confirm("この問題をスキップしますか？\n（正解扱いにはなりません）")) return;

        // UI更新
        msg.innerHTML = `<span style="color:orange">スキップしました</span>`;
        input.value = "(スキップ)";
        input.disabled = true;
        btn.disabled = true;
        skipBtn.disabled = true;

        // データ保存
        progress.answers[index] = {
          type: type || '',
          userAnswer: "(SKIPPED)",
          isCorrect: false,
          isSkipped: true,
          timestamp: new Date().toISOString()
        };

        putLog('answer', true, `Question ${index + 1} skipped`);
        addAnswerToDrawer(index, "(スキップ)");
        updateGateVisibility();
        updateProgressDisplay();
        saveToStorage();
      });
    }
    
    // 回答処理
    const handleAnswer = (val: string, isRestoreMode = false) => {
      if (type === 'essay') {
        if (!isRestoreMode && val.length === 0) {
          alert("内容を入力してください");
          return;
        }
        msg.innerHTML = `<span style="color:green">記録しました</span>`;
        input.disabled = false;
        btn.disabled = false;
        btn.style.backgroundColor = "";
        btn.textContent = "記録済み";

        if (!isRestoreMode) {
          progress.answers[index] = {
            type: type || '',
            userAnswer: val,
            isCorrect: true,
            timestamp: new Date().toISOString(),
            isSkipped: false
          };
          addAnswerToDrawer(index, "(記述済み)");
          putLog('answer', true, `Essay ${index + 1} submitted/updated`);
          updateGateVisibility();
          updateProgressDisplay();
        }
      }
      else if (type === 'problem') {
        // Problem
        const hash = simpleHash(val);
        const isCorrect = data.correctHashes.indexOf(hash) !== -1;

        if (!isRestoreMode) {
          putLog('answer', true, `Question ${index + 1} attempt`, { isCorrect });
        }

        if (isCorrect) {
          const ans = deobfuscateAnswer(data.encryptedText);
          msg.innerHTML = `<span style="color:blue">正解! (${ans})</span>`;
          input.disabled = true;
          btn.disabled = true;
          skipBtn.disabled = true;
          
          if (!isRestoreMode) {
            progress.answers[index] = {
            type: type || '',
              userAnswer: val,
              isCorrect: true,
              isSkipped: false,
              timestamp: new Date().toISOString(),
            };
            addAnswerToDrawer(index, ans);
            updateGateVisibility();
            updateProgressDisplay();
          }
        } else {
          msg.innerHTML = `<span style="color:red">不正解</span>`;
          if (!isRestoreMode) {
            progress.answers[index] = {
              type: type || '',
              userAnswer: val,
              isCorrect: false,
              isSkipped: false,
              timestamp: new Date().toISOString(),
            };
          }
        }
      }
      // 念のためにここで保存
      saveToStorage();
    };
    
    if(input.tagName === 'input') {
      const inputTag: HTMLInputElement = input as HTMLInputElement;
      inputTag.addEventListener('keydown', (event) => {
        // 日本語入力の確定操作(変換確定)でのEnterは無視する
        if (event.isComposing) return;
        
        if (event.key === 'Enter') {
          event.preventDefault(); // フォーム送信などを防ぐ
          handleAnswer(input.value.trim()); // 解答ボタンと同じ処理を実行
        }
      });
    }
    
    btn.addEventListener('click', () => {
      handleAnswer(input.value.trim());
    });
  });

  if (saveBtn && idInput && nameInput) {
    saveBtn.addEventListener('click', () => {
      progress.studentId = idInput.value;
      progress.name = nameInput.value;
      progress.savedAt = new Date().toISOString();

      if (!progress.studentId || !progress.name) {
        alert("学籍番号と氏名を入力してください");
        putLog('error', true, 'Save attempt failed: Missing ID or Name');
        saveToStorage();
        return;
      }

      putLog('system', true, 'Progress saved to JSON file');
      saveToStorage();
      const formattedJSON = formatJSON(progress);
      const jsonStr = JSON.stringify(formattedJSON, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${progress.studentId}_${progress.name}_progress.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  
  // ゲート更新 (復元された状態に基づいて開閉)
  updateGateVisibility();
  // 進捗状況の更新
  updateProgressDisplay();
  
  // システムログ
  putLog('system', true, 'System Loaded');
}

document.addEventListener('DOMContentLoaded', initStudentSystem);