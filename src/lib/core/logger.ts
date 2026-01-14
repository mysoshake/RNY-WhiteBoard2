// ./src/app/lib/core/logger.ts

import type { ActionLog } from "./type";

export function logger(log: ActionLog) {
  console.log(`[${log.timestamp}] [${log.type}] ${log.message}`, log.details || '');
}