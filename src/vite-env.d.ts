// ./src/vite-env.d.ts
/// <reference types="vite/client" />

declare module '*?inline' {
  const content: string;
  export default content;
}