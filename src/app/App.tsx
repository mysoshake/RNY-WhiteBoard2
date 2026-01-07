// ./src/app/App.tsx

import React, { type FunctionComponent, useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseMarkdown } from './parser';
import { StudentPage } from './template/StudentPage';
import './App.css';
import { STUDENT_MAIN_PATH, STUDENT_MAIN_REPOSITORY } from '../lib/core/constant';
import { MarkdownEditor } from './component/MarkdownEditor';

import studentCssString from '../style.css?inline';
import katexCssString from 'katex/dist/katex.min.css?inline';

// 最初の md テキスト
const SAMPLE_TEXT = 
`# 第1回 イントロダクション
## セクション

## 数式
$ \\zeta(s) = \\sum_{n=1}^{\\infty} \\dfrac{1}{n^s} $
$$ \\zeta(s) = \\sum_{n=1}^{\\infty} \\dfrac{1}{n^s} $$
${"\\"}(\\zeta(s) = \\sum_{n=1}^{\\infty} \\dfrac{1}{n^s} \\)
${"\\"}[\\zeta(s) = \\sum_{n=1}^{\\infty} \\dfrac{1}{n^s} \\]

### サブセクション
#### サブサブセクション
##### ちっちゃい
###### 超ちっちゃい

ようこそ。

#ex 説明:計算の基本
1 + 1 は 2 です。

#eg 例:
2 × 4 = 8

#pr 練習: 
2 × 4 = ?

#as 課題:
22 × 10 = ?

- 箇条書き1
- 箇条書き2
    - 箇条書き3
- 箇条書き4
    1. 連番1
        - おまけ
        - おまけ
    1. 連番2
        - おまけ
    1. 連番3
        - おまけ
        - おまけ
        - おまけ
        - おまけ
- 箇条書き5

**太字**

~~取り消し線~~

---
この上下区切り線
---

\`\`\`python
# ソースコード with Python
usertext = int(input("text"))
\`\`\`

#pb 短めの問題文('答え') | 答え | ans | こたえ

#pb
長い問題
複数行にわたって書く

**太字になってほしい**

@red{ **赤太字になってほしい** }

---
答え | ans | こたえ

\`source code\`



## 演習問題
#pb 10 + 20 は？ | 30

`;

const App: FunctionComponent = () => {
  const [markdown, setMarkdown] = useState(SAMPLE_TEXT);
  const [previewHtml, setPreviewHtml] = useState('');
  const [scriptUrl, setScriptUrl] = useState(STUDENT_MAIN_REPOSITORY + STUDENT_MAIN_PATH);

  // マークダウン入力時にプレビューを更新
  useEffect(() => {
    const { html } = parseMarkdown(markdown);
    setPreviewHtml(html);
  }, [markdown]);

  // ダウンロード処理
  const handleDownload = () => {
    const { html, problemData } = parseMarkdown(markdown);
    
    const combinedCssString = studentCssString + '\n' + katexCssString;
    
    // Reactコンポーネントを静的なHTML文字列に変換
    const pageMarkup = renderToStaticMarkup(
      <StudentPage 
        contentHtml={html} 
        problemData={problemData} 
        scriptUrl={scriptUrl}
        cssString={combinedCssString}
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
      <style>{studentCssString}</style>
      <style>{katexCssString}</style>
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
        {/* エディタエリア */}
        <div className="markdown-editor">
          <div className="markdown-editor-text-header">Markdown入力</div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MarkdownEditor 
              value={markdown} 
              onChange={setMarkdown} 
            />
          </div>
        </div>

        {/* プレビューエリア */}
        <div className="markdown-preview">
          <div className="markdown-preview-text-header">プレビュー</div>
            <div
              className="markdown-preview-text"
            >
              <div
                className="container-prev"
                // style={{ minHeight: 'auto', boxShadow: 'none', margin: '0' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;