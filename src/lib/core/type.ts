// core/type.ts

// 拡張されたデータ定義
export interface ProblemItem {
  mode: 'quiz' | 'essay';
  correctHashes: string[];
  encryptedText: string;
}

export interface ProblemProps {
  contentHtml: string;
  problemData: ProblemItem[];
  scriptUrl: string;
  cssString: string;
} 

// MarkdownEditorで使う
export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export interface BoxParser { 
  prefix: string;
  parse: (content: string) => string;
}

export interface ParseResult {
    html: string;
    problemData: ProblemItem[];
}

// マクロ定義用インターフェース
export interface MacroDef {
    name: string;      // コマンド名 (@cmd)
    argCount: number;  // 引数の数
    template: string;  // 変換後のテンプレート ($1 $2...)
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

