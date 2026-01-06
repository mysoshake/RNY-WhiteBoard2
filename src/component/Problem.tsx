// component/Problem.tsx

const createProblemHTML = (index: number, contentHtml: string): string => {
    return `<div class="problem-container" data-index="${index}">
              <div class="question-content">
                ${contentHtml}
              </div>
              <div class="input-area">
                <input type="text" class="student-input" placeholder="回答を入力">
                <button class="check-btn">判定</button>
                <span class="result-msg"></span>
              </div>
            </div>`;
}

// HTML生成用のヘルパー関数
export default createProblemHTML;