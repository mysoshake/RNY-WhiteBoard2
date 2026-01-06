// ./src/app/template/StudentPage.tsx

import React from 'react';
import type { ProblemProps } from '../../lib/core/type';

export const StudentPage: React.FC<ProblemProps> = ({ contentHtml, problemData, scriptUrl }) => {
  const jsonString = JSON.stringify(problemData);

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>授業資料</title>
        <link rel="stylesheet" type="text/css" media="screen" href="https://cdn.jsdelivr.net/gh/mysoshake/RNY-WhiteBoard2@e60e7f25b6bee51bb13a868ff78f856a2877dc80/src/style.css" />
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

        <script dangerouslySetInnerHTML={{ __html: `window.PROBLEM_DATA_LIST = ${jsonString};` }} />
        <script src={scriptUrl} />
      </body>
    </html>
  );
};