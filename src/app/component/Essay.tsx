// .src/app/component/Essay.ts
import React from 'react';
import '../style.css';


const Essay = (index: number, contentHtml: string): React.ReactElement => {
    return ( 
      <div
        className="problem-container essay-container"
        data-index={index}
        data-type="essay"
      >
        <div className="question-content">
          {contentHtml}
        </div>
        <div className="input-area-essay">
          <textarea
            className="student-essay-input"
            placeholder="ここに考察や感想を入力してください..."
            rows={6} />
          <div className="essay-controls">
              <button className="check-btn essay-submit-btn">記録して次へ</button>
              <span className="result-msg"></span>
          </div>
        </div>
      </div>
    );
}

export default Essay;