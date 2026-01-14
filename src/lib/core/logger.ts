// ./src/app/lib/core/logger.ts

import { IS_DEBUG_MODE } from "./constant";
import type { ActionLog } from "./type";

export function logger(log: ActionLog) {
  const args = [`[${log.timestamp}] [${log.type}] ${log.message}`, log.details || ''];
  if (log.type === "info") {
    console.info(...args);
  }
  else if (log.type === "warn") {
    console.warn(...args);
  }
  else if (log.type === "error") {
    console.error(...args);
  }
  else {
    console.log(...args);
  }
}

/**
* App内でのログ用関数
*/
export function putLogApp(type: ActionLog['type'], message: string, details?: any) {
  if (type !== "debug" || IS_DEBUG_MODE) {
    const log: ActionLog = {
        timestamp: new Date().toISOString(),
        type,
        message,
        details
    };
    logger(log);
  }
}