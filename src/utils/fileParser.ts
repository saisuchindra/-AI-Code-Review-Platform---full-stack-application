import fs from "fs";
import path from "path";
import { logger } from "./logger";

export interface ParsedFile {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  sizeBytes: number;
  lineCount: number;
}

const MAX_FILE_SIZE_BYTES = 1_048_576; // 1 MB
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".rar",
  ".pdf", ".doc", ".docx",
  ".exe", ".dll", ".so", ".dylib",
  ".mp3", ".mp4", ".avi", ".mov",
  ".class", ".jar", ".pyc", ".o",
]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out",
  "__pycache__", ".venv", "venv", ".idea", ".vscode",
  "coverage", ".next", ".nuxt", "vendor",
]);

export function parseFile(filePath: string): ParsedFile | null {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return null;

    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      logger.warn({ filePath, size: stat.size }, "File too large, skipping");
      return null;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lineCount = content.split("\n").length;

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: ext,
      content,
      sizeBytes: stat.size,
      lineCount,
    };
  } catch (error) {
    logger.error({ filePath, error }, "Failed to parse file");
    return null;
  }
}

export function walkDirectory(dirPath: string, maxFiles = 500): ParsedFile[] {
  const results: ParsedFile[] = [];

  function walk(currentPath: string): void {
    if (results.length >= maxFiles) return;

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const parsed = parseFile(fullPath);
        if (parsed) results.push(parsed);
      }
    }
  }

  walk(dirPath);
  return results;
}
