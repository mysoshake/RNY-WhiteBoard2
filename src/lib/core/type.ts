// core/type.ts

import { putLogApp } from "./logger";

// 拡張されたデータ定義
export interface ProblemItem {
  mode: 'problem' | 'essay';
  correctHashes: string[];
  encryptedText: string;
}

export interface ProblemProps {
  contentHtml: string;
  problemData: ProblemItem[];
  scriptUrl: string;
  cssString: string;
  pageTitle: string;
} 

// MarkdownEditorで使う
export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
* boxの共通処理
*/
export class BoxType {
  public name: string;
  public markSymbol: string;
  public titleHead: string;
  public holdPlace: boolean;
  /* trueにすると parserを通さなくなります */
  public rawText: boolean;
  public createHeader: (head: string) => string;
  public processContent: (lines: string[], options: string[]) => string;
  public parser: (rawtext: string) => string;
  
  public constructor(name: string, titleHead: string, holdPlace: 'hold' | 'none' = 'none', useRawText: boolean = false) {
    this.name = name;
    this.markSymbol = "#" + name;
    this.titleHead = titleHead;
    this.holdPlace = (holdPlace === "hold");
    this.rawText = useRawText;
    this.createHeader = (head: string) => {
      return `<div class="box-common box-${this.name}"><h2>${this.titleHead}:${head}</h2></div>
        <div class="box-container">`
    };
    this.processContent = (lines: string[], options: string[]) => {
      putLogApp("debug", `${this.name}ボックス:`, ...options);
      const raw = this.parser(lines.join("\n"));
      return raw;
    };
    this.parser = (rawtext: string) => {
      return rawtext;
    };
  }
  
}

export interface ParseResult {
  html: string;
  problemData: ProblemItem[];
  title: string;
}

// マクロ定義用インターフェース
export interface MacroDef {
  name: string;      // コマンド名 (@cmd)
  argCount: number;  // 引数の数
  template: string;  // 変換後のテンプレート ($1 $2...)
  keepContent: boolean;
}

export interface PlaceHolder {
  [key: string]: string
}

// 記録用データ構造
export interface StudentProgress {
  studentId: string;
  name: string;
  answers: {
    [index: number]: {
      type: string;
      userAnswer: string;
      isCorrect: boolean;
      isSkipped?: boolean;
      timestamp: string;
    }
  };
  logs: ActionLog[];
  savedAt: string;
}

export interface ProblemAnswer {
    index: number;
    status: 'o' | 'x' | '-';
    userAnswer: string;
}

export interface EssayAnswer {
    index: number;
    userAnswer: string;
}

// データ記録用の進捗データ
export interface QuickProgress {
  studentId: string;
  name: string;
  overview?: string; 
  pb_answers: ProblemAnswer[];
  es_answers: EssayAnswer[];
}

// ログ単体の定義
export interface ActionLog {
    timestamp: string;
    type: 'info' | 'answer' | 'system' | 'warn' | 'error' | 'debug';
    message: string;
    details?: any;
}

