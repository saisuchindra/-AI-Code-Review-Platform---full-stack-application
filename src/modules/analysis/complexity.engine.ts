import { ComplexityResult } from "../../types/analysis.types";

/**
 * Static complexity analysis engine.
 * Computes cyclomatic, cognitive complexity, nesting depth, and maintainability index.
 */
export function analyzeComplexity(sourceCode: string, language: string): ComplexityResult {
  const lines = sourceCode.split("\n");
  const linesOfCode = lines.length;
  const linesOfLogic = lines.filter((l) => {
    const trimmed = l.trim();
    return trimmed.length > 0 && !isComment(trimmed, language);
  }).length;

  const cyclomaticComplexity = computeCyclomaticComplexity(sourceCode, language);
  const cognitiveComplexity = computeCognitiveComplexity(sourceCode, language);
  const maxNestingDepth = computeMaxNesting(sourceCode, language);
  const functionCount = countFunctions(sourceCode, language);
  const parameterCountMax = computeMaxParameters(sourceCode, language);
  const halsteadDifficulty = computeHalsteadDifficulty(sourceCode);
  const maintainabilityIndex = computeMaintainabilityIndex(
    halsteadDifficulty,
    cyclomaticComplexity,
    linesOfLogic
  );

  // Normalize to 0-100 score (lower complexity = higher score)
  const score = Math.max(0, Math.min(100, Math.round(
    100 - (cyclomaticComplexity * 2) - (maxNestingDepth * 5) - (cognitiveComplexity * 1.5)
  )));

  return {
    cyclomaticComplexity,
    cognitiveComplexity,
    linesOfCode,
    linesOfLogic,
    maxNestingDepth,
    functionCount,
    parameterCountMax,
    halsteadDifficulty: Math.round(halsteadDifficulty * 100) / 100,
    maintainabilityIndex: Math.round(maintainabilityIndex * 100) / 100,
    score,
  };
}

function isComment(line: string, language: string): boolean {
  if (["python", "ruby", "shell"].includes(language)) {
    return line.startsWith("#");
  }
  return line.startsWith("//") || line.startsWith("/*") || line.startsWith("*") || line.startsWith("*/");
}

function computeCyclomaticComplexity(code: string, language: string): number {
  let complexity = 1; // base path

  // Decision keywords
  const patterns: RegExp[] = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\belif\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\bexcept\b/g,
    /\b\?\s*.*:/g,   // ternary
    /&&/g,
    /\|\|/g,
  ];

  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

function computeCognitiveComplexity(code: string, _language: string): number {
  let complexity = 0;
  let nestingLevel = 0;
  const lines = code.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Increment for structural complexity
    if (/\b(if|else\s+if|elif)\b/.test(trimmed)) {
      complexity += 1 + nestingLevel;
    }
    if (/\b(for|while|do)\b/.test(trimmed)) {
      complexity += 1 + nestingLevel;
    }
    if (/\b(catch|except)\b/.test(trimmed)) {
      complexity += 1 + nestingLevel;
    }
    if (/\b(switch|match)\b/.test(trimmed)) {
      complexity += 1 + nestingLevel;
    }

    // Track nesting via braces / indentation
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    nestingLevel += opens - closes;
    if (nestingLevel < 0) nestingLevel = 0;

    // Logical operators add complexity at any level
    const logicalOps = (trimmed.match(/&&|\|\|/g) || []).length;
    complexity += logicalOps;
  }

  return complexity;
}

function computeMaxNesting(code: string, _language: string): number {
  let maxDepth = 0;
  let currentDepth = 0;

  for (const char of code) {
    if (char === "{") {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    } else if (char === "}") {
      currentDepth--;
      if (currentDepth < 0) currentDepth = 0;
    }
  }

  return maxDepth;
}

function countFunctions(code: string, language: string): number {
  let count = 0;

  const patterns: Record<string, RegExp[]> = {
    javascript: [/\bfunction\s+\w+/g, /\bconst\s+\w+\s*=\s*(async\s+)?\(/g, /\w+\s*\([^)]*\)\s*\{/g],
    typescript: [/\bfunction\s+\w+/g, /\bconst\s+\w+\s*=\s*(async\s+)?\(/g, /\w+\s*\([^)]*\)\s*[:{]/g],
    python: [/\bdef\s+\w+/g],
    java: [/(public|private|protected)\s+\w+\s+\w+\s*\(/g],
    go: [/\bfunc\s+/g],
    rust: [/\bfn\s+\w+/g],
  };

  const langPatterns = patterns[language] || patterns["javascript"];
  for (const pattern of langPatterns) {
    const matches = code.match(pattern);
    if (matches) count += matches.length;
  }

  return count;
}

function computeMaxParameters(code: string, _language: string): number {
  // Matches function-like parameter lists
  const funcPattern = /\([^)]*\)/g;
  let maxParams = 0;

  let match;
  while ((match = funcPattern.exec(code)) !== null) {
    const inner = match[0].slice(1, -1).trim();
    if (inner.length === 0) continue;
    const paramCount = inner.split(",").length;
    if (paramCount > maxParams) maxParams = paramCount;
  }

  return maxParams;
}

function computeHalsteadDifficulty(code: string): number {
  // Simplified Halstead: operators and operands
  const operators = code.match(/[+\-*/%=<>!&|^~?:;,.{}[\]()]/g) || [];
  const operands = code.match(/\b[a-zA-Z_]\w*\b/g) || [];

  const uniqueOperators = new Set(operators).size || 1;
  const uniqueOperands = new Set(operands).size || 1;
  const totalOperands = operands.length || 1;

  // D = (n1 / 2) * (N2 / n2)
  const difficulty = (uniqueOperators / 2) * (totalOperands / uniqueOperands);
  return difficulty;
}

function computeMaintainabilityIndex(
  halsteadVolume: number,
  cyclomaticComplexity: number,
  linesOfLogic: number
): number {
  // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
  const hv = Math.max(halsteadVolume, 1);
  const loc = Math.max(linesOfLogic, 1);

  const mi = 171 - 5.2 * Math.log(hv) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(loc);
  return Math.max(0, Math.min(171, mi));
}
