// template/StudentPage.tsx

import React from 'react';
import type { ProblemProps } from '../core/type';


export const StudentPage: React.FC<ProblemProps> = ({ contentHtml, quizData, scriptUrl }) => {
  // JSONデータを安全に埋め込むための処理
  const jsonString = JSON.stringify(quizData);

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>授業資料</title>
        <style dangerouslySetInnerHTML={{ __html: `
            body { font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; padding: 20px; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; }
            
            /* #pb (問題) のスタイル */
            .problem-container { 
                border: 2px solid #007bff; padding: 15px; margin: 20px 0; 
                border-radius: 8px; background-color: #f0f8ff; 
            }
            .question-text { font-weight: bold; margin-top: 0; }
            .result-msg { margin-left: 10px; font-weight: bold; }
            
            /* #ex (説明) のスタイル */
            .box-ex { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px; }
            .box-ex h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }

            /* 制御用エリア */
            #save-area { 
                margin-top: 50px; padding: 20px; border-top: 1px solid #ccc; text-align: center; 
            }
            input, button { font-size: 1rem; padding: 5px 10px; }
        `}} />
      </head>
      <body>
        <div className="container">
          {/* Markdown変換結果のHTMLを埋め込み */}
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />

          <div id="save-area">
            <h3>学習の記録</h3>
            <label>
              学籍番号: <input type="text" id="student-id" />
            </label>
            <label>
              氏名: <input type="text" id="student-name" />
            </label>
            <button id="save-btn">学習データを保存する</button>
          </div>
        </div>

        {/* データ埋め込み */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.QUIZ_DATA_LIST = ${jsonString};`,
          }}
        />
        {/* ロジック読み込み */}
        <script src={scriptUrl} />
      </body>
    </html>
  );
};