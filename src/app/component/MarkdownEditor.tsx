// ./src/app/component/MarkdownEditor.tsx

import React, { useRef } from 'react';
import type { EditorProps } from '../../lib/core/type';

// 簡単なハイライト処理
const highlight = (text: string) => {
  // HTMLエスケープ (XSS対策)
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // ==========エスケープ==========
  // \ -> \\
  html = html.replace(/(\\)/g, '\\\\');
  // 空白文字 -> ['\.'] 
  html = html.replace(/( )/g, '\\.');
  
  // =====オリジナルコマンド===== 
  // コマンド (#pb, #ex など) -> 青色
  html = html.replace(/(^|\n)(#(pb|ex|pr|as|eg|es|cd).*)/g, '$1<span style="color:blue; font-weight:bold;">$2</span>');
  // コマンド閉じ (!# ...) -> 青色
  html = html.replace(/(^|\n)(!#.*)/g, '$1<span style="color:darkblue; font-weight:bold;">$2</span>');
  // 見出し (# タイトル) -> 緑色
  // html = html.replace(/(#{1,6}\s+.*)/g, '<span style="font-weight:bold;">$1</span>');
  html = html.replace(/(^|\n)(#{1,6}.*)/g, '$1<span style="color:green; font-weight:bold;">$2</span>');
  // インラインコマンド (@red) -> 紫色
  html = html.replace(/(@\w+)\{/g, '<span style="color:purple;">$1</span>{');
  // システムコマンド (\def, \title \src) -> 紫色
  html = html.replace(/(\\\\(def|src|title))/g, '<span style="color:purple;">$1</span>');
  // 1行内のソースコード -> オレンジ
  html = html.replace(/(`.+`)/g, '<span style="color:orange;">$1</span>');
  
  // ===== KaTeX数式 =====
  // $数式$ か $$数式$$ 
  html = html.replace(/((\$|\$\$|\\\\\[|\\\\\()([\s\S]*?)(\$|\$\$|\\\\\]|\\\\\)))/g, '<span style="color:#074;">$1</span>');
  
  // ===== 普通のMD記法===== 
  // 太字 ** text **
  html = html.replace(/(\*\*.+?\*\*)/g, '<span style="font-weight:bold;">$1</span>');
  // 取消 ~~ text ~~
  html = html.replace(/(~~.+~~)/g, '<span style="text-decoration: line-through;">$1</span>');
  // 箇条書き/番号 + - * 1.
  html = html.replace(/(^|\n)((\\\.)*)((-|\+|\*|1.)((\\.)))/g, '$1<span style="font-weight:bold; color:#559;">$2$4</span>');
  // // ルビ [漢字]{かんじ}
  // html = html.replace(/(^|\n)([ ]*)((-|\+|\*|1.)[ ])/g, '$1<span style="font-weight:bold; color:#559;">$2$3</span>');
  // 区切り線 (---) -> 灰色
  html = html.replace(/(^|\n)(---)/g, '$1<span style="color:#5999; font-weight:bold;">$2</span>');

  // インデント表示
  // [\.\.\.\.] -> [\^\-\-\-]
  html = html.replace(/(\\\.\\\.\\\.\\\.)/g, '\\^\\-\\-\\-');
  // [\^][\-] -> タグ付き[^][-]
  html = html.replace(/(\\(-))/g, '<span style="color:#5999; position:relative; top:-5px;">$2</span>');
  html = html.replace(/(\\(\^))/g, '<span style="color:#5999;">$2</span>');
  
  // ==========デスケープ==========
  // [\.] -> タグ付き[ ] CSSで文字の見た目を変える
  html = html.replace(/\\(\.)/g, '<span class="markdown-visible-space"> </span>');
  // \\ -> \
  html = html.replace(/(\\\\)/g, '\\');


  // 行末に改行の文字 ←
  html = html.replace(/(\n)/g, '<span style="color:#5999; position: absolute;">←</span>$1');
  
  html += '<span style="color:#5357;">[EOF]</span>';
  // 末尾の改行の挙動を合わせるために <br> を追加
  if (text.endsWith('\n')) {
    html += '<br />';
  }

  return html;
};

export const MarkdownEditor: React.FC<EditorProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // スクロール同期
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };
  
  // Tabキー入力のハンドリング
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault(); // フォーカス移動を無効化

      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // 挿入するインデント（スペース4つ）
      const indent = "    ";

      // 現在のカーソル位置にインデントを挿入
      const newValue = value.substring(0, start) + indent + value.substring(end);

      // 親コンポーネントへ通知
      onChange(newValue);

      // カーソル位置をインデント分だけ後ろにずらす
      // Reactの再レンダリング後にカーソル位置をセットする必要があるため setTimeout を使用
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + indent.length;
        }
      }, 0);
    }
  };
  
  const commonStyle: React.CSSProperties = {
    fontFamily: 'monospace, "Menlo", "Monaco", "Consolas"',
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
    /* 必須：折り返し設定の統一 */
    overflow: 'auto',
    boxSizing: 'border-box',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',      /* 端で折り返す */
    wordBreak: 'break-all',      /* 【重要】単語の途中でも強制的に改行する */
    overflowWrap: 'break-word',  /* 念のため */
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff' }}>
      {/* 背景のハイライト用レイヤー */}
      <pre
        ref={preRef}
        style={{
          ...commonStyle,
          pointerEvents: 'none', // クリックを下のtextareaに通す
          color: '#333',
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlight(value) }}
      />

      {/* 前景の入力用レイヤー (透明) */}
      <textarea
        title="markdown editor"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
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