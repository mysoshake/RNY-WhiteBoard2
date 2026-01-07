// ./src/vite-env.d.ts
/// <reference types="vite/client" />

declare module '*?inline' {
  const content: string;
  export default content;
}

// MathJaxの型定義
interface Window {
  MathJax: {
    typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
    typeset: (elements?: HTMLElement[]) => void;
  }
}