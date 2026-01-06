// ./src/app/App.tsx

import React, { type FunctionComponent, useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseMarkdown } from './parser';
import { StudentPage } from './template/StudentPage';
import './App.css'; // スタイルが必要なら別途作成、あるいはstyle.cssを利用
import { STUDENT_MAIN_PATH } from '../lib/core/constant';

// 最初の md テキスト
const SAMPLE_TEXT = 
`# 第1回 イントロダクション

ようこそ。

#ex 計算の基本
1 + 1 は 2 です。

## 演習問題
#pb 10 + 20 は？ | 30
`;

const App: FunctionComponent = () => {
  const [markdown, setMarkdown] = useState(SAMPLE_TEXT);
  const [previewHtml, setPreviewHtml] = useState('');
  const [scriptUrl, setScriptUrl] = useState(STUDENT_MAIN_PATH);

  // マークダウン入力時にプレビューを更新
  useEffect(() => {
    const { html } = parseMarkdown(markdown);
    setPreviewHtml(html);
  }, [markdown]);

  // ダウンロード処理
  const handleDownload = () => {
    const { html, quizData } = parseMarkdown(markdown);
    
    // Reactコンポーネントを静的なHTML文字列に変換
    const pageMarkup = renderToStaticMarkup(
      <StudentPage 
        contentHtml={html} 
        quizData={quizData} 
        scriptUrl={scriptUrl} 
      />
    );

    // renderToStaticMarkup は DOCTYPE を含まないので手動で追加
    const finalHtml = `<!DOCTYPE html>${pageMarkup}`;

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lecture_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>授業資料作成ツール</h1>
        <div>
          JSファイル パス: 
          <input 
            className="input-js-file-url"
            type="text" 
            value={scriptUrl} 
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="JSファイルURL"
          />
        </div>
        <button
          className="button-std"
          onClick={handleDownload}
        >
          HTML出力
        </button>
      </header>

      <div className="markdown-container">
        {/* 入力エリア */}
        <div className="markdown-editor">
          <div className="markdown-preview-text-header">Markdown入力</div>
          <textarea
            className="markdown-editor-text"
            title="Input Area"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
        </div>

        {/* プレビューエリア */}
        <div className="markdown-preview">
          <div className="markdown-preview-text-header">プレビュー</div>
          <div
            className="markdown-preview-text"
            dangerouslySetInnerHTML={{ __html: previewHtml }} 
          />
        </div>
      </div>
    </div>
  );
};

export default App;