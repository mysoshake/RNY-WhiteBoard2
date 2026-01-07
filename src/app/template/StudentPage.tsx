// ./src/app/template/StudentPage.tsx

import React from 'react';
import type { ProblemProps } from '../../lib/core/type';

export const StudentPage: React.FC<ProblemProps> = ({ contentHtml, problemData, scriptUrl, cssString}) => {
  const jsonString = JSON.stringify(problemData);
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>授業資料</title>
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" 
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{ __html: cssString }} />
      </head>
      <body>
        {/* エラー表示エリア */}
        <div id="loading-error">
            <h2>システム読み込みエラー</h2>
            <p>プログラムファイルの読み込みに失敗しました。</p>
            <p>インターネット接続を確認するか、<br/>ファイル <code>student-viewer.js</code> が同じフォルダにあるか確認してください。</p>
        </div>
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
        
        {/* メインスクリプト読み込み */}
        <div dangerouslySetInnerHTML={{ __html: `
            <script src="${scriptUrl}" onerror="document.getElementById('loading-error').style.display='block'"></script>
        `}} />
      </body>
    </html>
  );
};