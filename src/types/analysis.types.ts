// ─── AI Engine Output Types ──────────────────────────────────────────────────

export interface AnalysisMetadata {
  engine_version: string;
  analysis_type: string;
  confidence_score: number;
}

export interface FindingItem {
  line_number: number | null;
  severity: SeverityLevel;
  issue: string;
  technical_explanation: string;
  recommended_fix: string;
}

export type SeverityLevel = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AIAnalysisResult {
  analysis_metadata: AnalysisMetadata;
  logical_errors: FindingItem[];
  edge_case_risks: FindingItem[];
  architectural_weaknesses: FindingItem[];
  security_risks: FindingItem[];
  performance_risks: FindingItem[];
  concurrency_risks: FindingItem[];
  data_flow_risks: FindingItem[];
  production_hardening_gaps: FindingItem[];
  refactoring_recommendations: FindingItem[];
  executive_summary: string;
}

// ─── Complexity Engine Types ─────────────────────────────────────────────────

export interface ComplexityResult {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  linesOfLogic: number;
  maxNestingDepth: number;
  functionCount: number;
  parameterCountMax: number;
  halsteadDifficulty: number;
  maintainabilityIndex: number;
  score: number; // 0-100 normalized
}

// ─── Security Engine Types ───────────────────────────────────────────────────

export interface SecurityFinding {
  rule: string;
  severity: SeverityLevel;
  line: number | null;
  pattern: string;
  message: string;
  cwe?: string;
}

export interface SecurityResult {
  findings: SecurityFinding[];
  score: number; // 0-100 normalized (100 = no issues)
}

// ─── Diff Engine Types ───────────────────────────────────────────────────────

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface DiffFile {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffResult {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

// ─── Composite Analysis Output ───────────────────────────────────────────────

export interface FullAnalysisResult {
  ai: AIAnalysisResult;
  complexity: ComplexityResult;
  security: SecurityResult;
  overallScore: number;
  qualityScore: number;
  securityScore: number;
  complexityScore: number;
}

// ─── Language Detection ──────────────────────────────────────────────────────

export interface DetectedLanguage {
  language: string;
  confidence: number;
  extensions: string[];
}
