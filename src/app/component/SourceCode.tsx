// .src/app/component/SourceCode.tsx

const SourceCode = (title: string, language: string, contentHtml: string): string => {
  return (
`
<div class="code-container">
<div class="code-title">${title}</div>
<div class="code-content"><pre class="line-numbers"><code class="language-${language}">${contentHtml}</code></pre></div>
</div>
`
  );
}

export default SourceCode;