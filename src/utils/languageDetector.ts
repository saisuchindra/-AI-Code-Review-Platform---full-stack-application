import path from "path";
import { DetectedLanguage } from "../types/analysis.types";

const EXTENSION_MAP: Record<string, string> = {
  // JavaScript / TypeScript
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
  // Python
  ".py": "python", ".pyw": "python", ".pyi": "python",
  // Java
  ".java": "java",
  // C / C++
  ".c": "c", ".h": "c",
  ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp",
  // C#
  ".cs": "csharp",
  // Go
  ".go": "go",
  // Rust
  ".rs": "rust",
  // Ruby
  ".rb": "ruby", ".rake": "ruby",
  // PHP
  ".php": "php",
  // Swift
  ".swift": "swift",
  // Kotlin
  ".kt": "kotlin", ".kts": "kotlin",
  // Scala
  ".scala": "scala",
  // Shell
  ".sh": "shell", ".bash": "shell", ".zsh": "shell",
  // SQL
  ".sql": "sql",
  // HTML / CSS
  ".html": "html", ".htm": "html",
  ".css": "css", ".scss": "scss", ".less": "less",
  // YAML / JSON / Config
  ".yaml": "yaml", ".yml": "yaml",
  ".json": "json",
  ".toml": "toml",
  ".xml": "xml",
  // Dart
  ".dart": "dart",
  // Lua
  ".lua": "lua",
  // R
  ".r": "r", ".R": "r",
  // Elixir
  ".ex": "elixir", ".exs": "elixir",
  // Haskell
  ".hs": "haskell",
};

const SHEBANG_MAP: Record<string, string> = {
  node: "javascript",
  python: "python",
  python3: "python",
  ruby: "ruby",
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  perl: "perl",
  php: "php",
};

const KEYWORD_PATTERNS: { pattern: RegExp; language: string; weight: number }[] = [
  { pattern: /\bimport\s+React\b|from\s+['"]react['"]/, language: "javascript", weight: 0.9 },
  { pattern: /\bdef\s+\w+\s*\(.*\)\s*:/, language: "python", weight: 0.85 },
  { pattern: /\bfunc\s+\w+\s*\(/, language: "go", weight: 0.8 },
  { pattern: /\bfn\s+\w+\s*\(/, language: "rust", weight: 0.8 },
  { pattern: /\bpublic\s+static\s+void\s+main\b/, language: "java", weight: 0.95 },
  { pattern: /\bpackage\s+\w+;/, language: "java", weight: 0.7 },
  { pattern: /\busing\s+System\b/, language: "csharp", weight: 0.9 },
  { pattern: /\bnamespace\s+\w+\s*\{/, language: "csharp", weight: 0.6 },
  { pattern: /<\?php/, language: "php", weight: 0.99 },
  { pattern: /\bclass\s+\w+\s*<\s*ApplicationRecord\b/, language: "ruby", weight: 0.9 },
  { pattern: /\bmodule\.exports\b|require\s*\(/, language: "javascript", weight: 0.7 },
  { pattern: /\binterface\s+\w+\s*\{/, language: "typescript", weight: 0.6 },
];

export function detectLanguage(fileName: string, content?: string): DetectedLanguage {
  const ext = path.extname(fileName).toLowerCase();

  // 1. Extension-based detection
  if (EXTENSION_MAP[ext]) {
    return {
      language: EXTENSION_MAP[ext],
      confidence: 0.95,
      extensions: [ext],
    };
  }

  // 2. Shebang-based detection
  if (content) {
    const firstLine = content.split("\n")[0];
    if (firstLine.startsWith("#!")) {
      for (const [interpreter, language] of Object.entries(SHEBANG_MAP)) {
        if (firstLine.includes(interpreter)) {
          return { language, confidence: 0.9, extensions: [] };
        }
      }
    }

    // 3. Content heuristic detection
    for (const { pattern, language, weight } of KEYWORD_PATTERNS) {
      if (pattern.test(content)) {
        return { language, confidence: weight, extensions: [] };
      }
    }
  }

  return { language: "unknown", confidence: 0, extensions: [] };
}

export function getLanguageFromExtension(ext: string): string {
  return EXTENSION_MAP[ext.startsWith(".") ? ext : `.${ext}`] ?? "unknown";
}
