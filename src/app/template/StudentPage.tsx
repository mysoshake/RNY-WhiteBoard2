// ./src/app/template/StudentPage.tsx

import React from 'react';
import type { ProblemProps } from '../../lib/core/type';

export const StudentPage: React.FC<ProblemProps> = ({ contentHtml, quizData, scriptUrl }) => {
  const jsonString = JSON.stringify(quizData);

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>授業資料</title>
        <style dangerouslySetInnerHTML={{ __html: `
            /* --- 基本レイアウト --- */
            body {
              font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #dcdcdc; /* 背景グレー */
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: #fff; /* コンテンツ領域は白 */
              min-height: 100vh;
              padding: 40px;
              box-shadow: 0 0 15px rgba(0,0,0,0.1);
              position: relative;
              padding-bottom: 60px; /* footer用余白 */
            }

            /* --- 問題 (#pb) --- */
            .problem-container { 
                border: 2px solid #007bff; padding: 15px; margin: 25px 0; 
                border-radius: 8px; background-color: #f0f8ff; 
            }
            .question-content p { margin: 0 0 10px 0; font-weight: bold; }
            .input-area { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
            .student-input { padding: 8px; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; flex: 1; }
            .check-btn { padding: 8px 16px; font-size: 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .check-btn:disabled { background: #ccc; cursor: not-allowed; }
            .result-msg { font-weight: bold; }

            /* --- 汎用ボックス --- */
            .box-common { padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 6px solid; }
            .box-common h3 { margin: 0 0 10px 0; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-size: 1.1em; }
            .box-ex { background-color: #e1f5fe; border-color: #03a9f4; }
            .box-pr { background-color: #fffde7; border-color: #ffeb3b; }
            .box-as { background-color: #ffebee; border-color: #f44336; }
            .box-eg { background-color: #f3e5f5; border-color: #9c27b0; }

            /* --- ゲートシステム --- */
            .is-locked { display: none !important; }

            /* --- 制御エリア --- */
            #save-area { margin-top: 60px; padding: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; }

            /* --- スライド式解答リスト (ドロワー) --- */
            .answer-drawer {
                position: fixed;
                top: 0;
                right: -320px; /* 初期状態は画面外 */
                width: 300px;
                height: 100vh;
                background-color: #333;
                color: #fff;
                box-shadow: -2px 0 5px rgba(0,0,0,0.3);
                transition: right 0.3s ease;
                z-index: 1000;
                display: flex;
                flex-direction: column;
            }
            .answer-drawer.open {
                right: 0; /* 表示状態 */
            }
            .drawer-toggle {
                position: absolute;
                left: -40px;
                top: 20px;
                width: 40px;
                height: 40px;
                background-color: #333;
                color: #fff;
                border: none;
                border-radius: 5px 0 0 5px;
                cursor: pointer;
                font-weight: bold;
                writing-mode: vertical-rl; /* 縦書き風 */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .drawer-header {
                padding: 15px;
                background-color: #222;
                border-bottom: 1px solid #444;
                font-weight: bold;
            }
            .drawer-list {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
            }
            .drawer-item {
                background: #444;
                margin-bottom: 10px;
                padding: 10px;
                border-radius: 4px;
                font-size: 0.9rem;
                animation: slideIn 0.3s ease;
            }
            .drawer-item-q { color: #aaa; font-size: 0.8rem; margin-bottom: 4px; }
            .drawer-item-a { color: #4caf50; font-weight: bold; }

            @keyframes slideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            /* --- フッター --- */
            .app-footer {
                text-align: center;
                padding: 10px;
                background-color: #f0f0f0;
                color: #666;
                font-size: 0.8rem;
                border-top: 1px solid #ddd;
                position: absolute;
                bottom: 0;
                width: 100%;
                left: 0;
                box-sizing: border-box;
            }
        `}} />
      </head>
      <body>
        <div className="container" id="main-content">
          {/* コンテンツ埋め込み */}
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />

          <div id="save-area" className="is-locked">
            <h3>学習の記録</h3>
            <p><small>すべての課題を完了すると保存できます</small></p>
            <label>学籍番号: <input type="text" id="student-id" /></label>
            <label>氏名: <input type="text" id="student-name" /></label>
            <button id="save-btn">学習データを保存する</button>
          </div>

          <footer className="app-footer">
            &copy; {new Date().getFullYear()} RNY WhiteBoard System.
          </footer>
        </div>

        {/* スライド式解答リスト */}
        <div id="answer-drawer" className="answer-drawer">
            <button id="drawer-toggle" className="drawer-toggle">◀ 解答</button>
            <div className="drawer-header">正解リスト</div>
            <div id="drawer-list" className="drawer-list">
                {/* ここに正解が追加されていく */}
            </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `window.QUIZ_DATA_LIST = ${jsonString};` }} />
        <script src={scriptUrl} />
      </body>
    </html>
  );
};