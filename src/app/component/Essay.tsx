// .src/app/component/Essay.ts

const Essay = (index: number, contentHtml: string, firstRows: number=6): string => {
  return (
`
<div class="problem-container" data-index="${index}" data-type="essay">
    <div class="question-content">
      ${contentHtml}
    </div>
    <div class="essay-container">
      <textarea class="essay-student-input" placeholder="ここに考察や感想を入力してください..." rows="${firstRows}"></textarea>
      <div class="essay-controls">
          <button type="button" class="check-btn essay-submit-btn">記録して次へ</button>
          <span class="result-msg"></span>
      </div>
    </div>
  </div>
`
  );
}

export default Essay;