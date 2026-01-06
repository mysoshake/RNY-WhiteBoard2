// core/type.ts

// 拡張されたデータ定義
export interface QuizItem {
  correctHashes: string[];
  encryptedText: string;
}

export interface BoxParser { 
  prefix: string;
  parse: (content: string) => string;
}

export interface ParseResult {
    html: string;
    quizData: QuizItem[];
}

// 記録用データ構造
export interface StudentProgress {
  studentId: string;
  name: string;
  answers: {
    [index: number]: {
      userAnswer: string;
      isCorrect: boolean;
      timestamp: string;
    }
  };
  savedAt: string;
}