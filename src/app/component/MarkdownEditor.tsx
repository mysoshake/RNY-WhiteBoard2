import React, { useState, useRef } from 'react';


// 簡単なハイライト処理
const highlight = (text: string) => {
  // HTMLエスケープ (XSS対策)
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 1. コマンド (#pb, #ex など) -> 青色
  html = html.replace(/(^|\n)(#(pb|ex|pr|as|eg).*)/g, '$1<span style="color:blue; font-weight:bold;">$2</span>');

  // 2. 見出し (# タイトル) -> 緑色
  html = html.replace(/(^|\n)(#+ .*)/g, '$1<span style="color:green; font-weight:bold;">$2</span>');

  // 3. インラインコマンド (@red{}, \def{}) -> 紫色
  html = html.replace(/(@\w+|\\def)/g, '<span style="color:purple;">$1</span>');

  // 4. 区切り線 (---) -> 灰色
  html = html.replace(/(^|\n)(---)/g, '$1<span style="color:#999; font-weight:bold;">$2</span>');

  // 末尾の改行の挙動を合わせるために <br> を追加
  if (text.endsWith('\n')) {
    html += '<br />';
  }

  return html;
};

export const SimpleEditor: React.FC<Props> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // スクロール同期
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const commonStyle: React.CSSProperties = {
    fontFamily: '"Menlo", "Monaco", "Consolas", monospace',
    fontSize: '16px',
    lineHeight: '1.5',
    padding: '10px',
    margin: 0,
    border: 'none',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff' }}>
      {/* 背景のハイライト用レイヤー */}
      <pre
        ref={preRef}
        style={{
          ...commonStyle,
          pointerEvents: 'none', // クリックを下のtextareaに通す
          color: 'transparent',  // 基本文字は透明にして、spanだけ色を出す... としたいが
                                 // overlay方式では「文字は同じ場所」に出すので
                                 // pre側で色をつけ、textareaを透明にするのが定石
          color: '#333',         // 基本色
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlight(value) }}
      />

      {/* 前景の入力用レイヤー (透明) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        style={{
          ...commonStyle,
          background: 'transparent',
          color: 'transparent', // 文字を透明にする（キャレットだけ見える）
          caretColor: '#000',   // キャレット(カーソル)の色は黒
          zIndex: 2,
          resize: 'none',
          outline: 'none',
        }}
      />
    </div>
  );
};