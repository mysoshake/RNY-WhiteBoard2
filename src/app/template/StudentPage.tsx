// ./src/app/template/StudentPage.tsx

import React from 'react';
import type { ProblemProps } from '../../lib/core/type';

export const StudentPage: React.FC<ProblemProps> = ({ contentHtml, /*problemData,*/ scriptUrl }) => {
  // const jsonString = JSON.stringify(problemData);
  
  // const errorHandlerScript = `
  //     function showLoadError() {
  //       var err = document.getElementById('loading-error');
  //       if (err) err.style.display = 'block';
  //     }
  //     // 3秒経っても window.PROBLEM_DATA_LIST が処理されていない(viewerが走っていない)場合はエラーとみなす
  //     setTimeout(function() {
  //       if (!window.RNY_SYSTEM_LOADED) {
  //         // viewer.ts側で読み込み成功時にこのフラグを立てるように修正が必要
  //         // 今回は単純に script タグの onerror で制御する方式をメインにする
  //       }
  //     }, 3000);
  //   `;

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>授業資料</title>
        <link rel="stylesheet" type="text/css" media="screen" href="https://cdn.jsdelivr.net/gh/mysoshake/RNY-WhiteBoard2/src/style.css" />
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
        {/* メインスクリプト読み込み (エラーハンドリング付き) */}
        {/* ReactのonErrorはDOM属性として出力されないことがあるため、dangerouslySetInnerHTMLでscriptタグを直接書くのが確実です */}
        <div dangerouslySetInnerHTML={{ __html: `
            <script src="${scriptUrl}" onerror="document.getElementById('loading-error').style.display='block'"></script>
        `}} />
      </body>
    </html>
  );
};