// ./src/app/App.tsx

import React, { type FunctionComponent, useState, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseMarkdown } from './parser';
import { StudentPage } from './template/StudentPage';
import { IS_DEBUG_MODE, STUDENT_MAIN_PATH, STUDENT_MAIN_REPOSITORY } from '../lib/core/constant';
import { MarkdownEditor } from './component/MarkdownEditor';

import './App.css'; 
import appCssString from './App.css?inline'; 
import studentCssString from '../style.css?inline';

const STORAGE_KEY_DRAFT_ID = 'rny_teacher_draft';

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
  // 初期化時にLocalStorageから読み込む
  const [markdown, setMarkdown] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DRAFT_ID);
    return saved !== null ? saved : SAMPLE_TEXT;
  });
  const [previewHtml, setPreviewHtml] = useState('');
  const [scriptUrl, setScriptUrl] = useState(STUDENT_MAIN_REPOSITORY + STUDENT_MAIN_PATH);

  const previewRef = useRef<HTMLDivElement>(null);

  // マークダウン入力時にプレビューを更新しつつ自動保存
  useEffect(() => {
    const { html } = parseMarkdown(markdown);
    setPreviewHtml(html);
    localStorage.setItem(STORAGE_KEY_DRAFT_ID, markdown);
  }, [markdown]);

  // previewHtmlが変わるたびにMathJaxを更新
  useEffect(() => {
    const renderMath = () => {
      if (previewRef.current && window.MathJax) {
        // まだライブラリ本体がロードされていない(configオブジェクトだけの)場合は待つ
        if (!window.MathJax.typesetPromise) {
          setTimeout(renderMath, 200); // 0.2秒後に再トライ
          return;
        }

        // レンダリング実行
        window.MathJax.typesetPromise([previewRef.current])
          .then(() => {
            // 成功
          })
          .catch((err) => {
            // レンダリング中の再呼び出しエラーなどは無視してOK
            console.warn('MathJax typesetting failed:', err);
            // 失敗した場合も少し待ってリトライさせると安定する場合がある
            setTimeout(renderMath, 500); 
          });
      }
    };

    renderMath();
  }, [previewHtml]);
  
  // ダウンロード処理
  const handleDownload = () => {
    const { html, problemData, title } = parseMarkdown(markdown);
    
    // 他のCSSを組み合わせるときはここに追記
    const combinedCssString = studentCssString;
    
    // Reactコンポーネントを静的なHTML文字列に変換
    const pageMarkup = renderToStaticMarkup(
      <StudentPage 
        contentHtml={html} 
        problemData={problemData} 
        scriptUrl={scriptUrl}
        cssString={combinedCssString}
        pageTitle={title}
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
      <header className="app-header">
        {IS_DEBUG_MODE ?
          <h1 className="app-header-title debug">授業資料作成ツール（でばっぐ）</h1> :
          <h1 className="app-header-title">授業資料作成ツール</h1> 
        }
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

      <style>{appCssString}</style>

      <div className="markdown-container">
        {/* エディタエリア */}
        <div className="markdown-editor">
          <div className="markdown-editor-text-header">Markdown入力</div>
          <div className="markdown-editor-wrapper">
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
                ref={previewRef}
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;