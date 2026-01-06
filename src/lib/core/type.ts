// core/type.ts

// 拡張されたデータ定義
export interface ProblemItem {
  correctHashes: string[];
  encryptedText: string;
}

export interface ProblemProps {
  contentHtml: string;
  problemData: ProblemItem[];
  scriptUrl: string;
}

export interface BoxParser { 
  prefix: string;
  parse: (content: string) => string;
}

export interface ParseResult {
    html: string;
    problemData: ProblemItem[];
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
  logs: ActionLog[];
  savedAt: string;
}

// ログ単体の定義
export interface ActionLog {
    timestamp: string;
    type: 'info' | 'answer' | 'system' | 'error';
    message: string;
    details?: any;
}

