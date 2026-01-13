// ./src/lib/core/constant.ts
import { STUDENT_MAIN_REPOSITORY_LOCAL } from "./constant.local";

export const IS_DEBUG_MODE = true;
export const STUDENT_MAIN_REPOSITORY = IS_DEBUG_MODE ? STUDENT_MAIN_REPOSITORY_LOCAL : "https://cdn.jsdelivr.net/gh/mysoshake/RNY-WhiteBoard2@latest/";

export const STUDENT_MAIN_PATH = "dist/student/student-viewer.js";
export const STUDENT_STYLE_PATH = "src/style.css";

