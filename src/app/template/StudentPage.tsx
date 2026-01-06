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
            body { font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; padding: 20px; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            
            /* --- 問題 (#pb) --- */
            .problem-container { 
                border: 2px solid #007bff; padding: 15px; margin: 25px 0; 
                border-radius: 8px; background-color: #f0f8ff; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .question-content p { margin: 0 0 10px 0; font-weight: bold; }
            .input-area { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
            .student-input { padding: 8px; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; flex: 1; }
            .check-btn { padding: 8px 16px; font-size: 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .check-btn:disabled { background: #ccc; cursor: not-allowed; }
            .result-msg { font-weight: bold; }

            /* --- 汎用ボックススタイル --- */
            .box-common { padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 6px solid; }
            .box-common h3 { margin: 0 0 10px 0; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-size: 1.1em; }
            
            /* #ex 説明 (水色) */
            .box-ex { background-color: #e1f5fe; border-color: #03a9f4; }
            /* #pr 練習 (黄色) */
            .box-pr { background-color: #fffde7; border-color: #ffeb3b; }
            /* #as 課題 (赤色) */
            .box-as { background-color: #ffebee; border-color: #f44336; }
            /* #eg 例 (紫) */
            .box-eg { background-color: #f3e5f5; border-color: #9c27b0; }

            /* --- ゲートシステム用 --- */
            /* 未解決エリアを隠すためのクラス */
            .is-locked { display: none !important; }

            /* --- 制御エリア --- */
            #save-area { margin-top: 60px; padding: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; }
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
        </div>

        <script dangerouslySetInnerHTML={{ __html: `window.QUIZ_DATA_LIST = ${jsonString};` }} />
        <script src={scriptUrl} />
      </body>
    </html>
  );
};