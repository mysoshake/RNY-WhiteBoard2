// tc/App.tsx

import React, { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseMarkdown } from './parser';
import { StudentPage } from '../template/StudentPage';
import './App.css'; // スタイルが必要なら別途作成、あるいはstyle.cssを利用

// 初期テキスト
const INITIAL_TEXT = `# 第1回 イントロダクション

ようこそ。

#ex 計算の基本
1 + 1 は 2 です。

## 演習問題
#pb 10 + 20 は？ | 30
`;

export const App: React.FC = () => {
  const [markdown, setMarkdown] = useState(INITIAL_TEXT);
  const [previewHtml, setPreviewHtml] = useState('');
  const [scriptUrl, setScriptUrl] = useState('student-main.js'); // 初期値は相対パスにしておくとテストしやすい

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
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '10px', background: '#eee', borderBottom: '1px solid #ccc', display:'flex', gap:'10px', alignItems:'center' }}>
        <h1 style={{margin:0, fontSize:'1.2rem', marginRight:'auto'}}>授業資料作成ツール</h1>
        <input 
          type="text" 
          value={scriptUrl} 
          onChange={(e) => setScriptUrl(e.target.value)}
          placeholder="JSファイルURL"
          style={{width: '300px'}}
        />
        <button onClick={handleDownload} style={{padding:'5px 15px', cursor:'pointer'}}>HTML出力</button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 入力エリア */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #ccc' }}>
          <div style={{ padding: '5px', background: '#f9f9f9', fontSize: '0.9em' }}>Markdown入力</div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{ flex: 1, padding: '10px', resize: 'none', border: 'none', outline: 'none', fontSize:'16px' }}
          />
        </div>

        {/* プレビューエリア */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ padding: '5px', background: '#f9f9f9', fontSize: '0.9em' }}>プレビュー</div>
          <div 
            style={{ flex: 1, padding: '20px', overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }} 
          />
        </div>
      </div>
    </div>
  );
};