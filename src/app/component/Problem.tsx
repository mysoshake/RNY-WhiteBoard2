// ./src/app/component/Problem.tsx

const Problem = (index: number, contentHtml: string): string => {
  return (
`
<div class="problem-container" data-index="${index}">
  <div class="question-content">
    ${contentHtml}
  </div>
  <div class="input-area">
    <input type="text" class="student-input" placeholder="回答を入力">
    <button class="check-btn">判定</button>
    <span class="result-msg"></span>
  </div>
</div>
`
  );
}

export default Problem;