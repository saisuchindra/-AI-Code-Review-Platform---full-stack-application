import { SecurityFinding, SecurityResult, SeverityLevel } from "../../types/analysis.types";

interface SecurityRule {
  id: string;
  pattern: RegExp;
  severity: SeverityLevel;
  message: string;
  cwe?: string;
  languages?: string[];
}

// ─── Security Rule Database ──────────────────────────────────────────────────

const SECURITY_RULES: SecurityRule[] = [
  // Injection patterns
  {
    id: "SEC001",
    pattern: /eval\s*\(/g,
    severity: "CRITICAL",
    message: "Use of eval() enables arbitrary code execution",
    cwe: "CWE-95",
  },
  {
    id: "SEC002",
    pattern: /new\s+Function\s*\(/g,
    severity: "HIGH",
    message: "Dynamic function creation via new Function() may enable code injection",
    cwe: "CWE-95",
  },
  {
    id: "SEC003",
    pattern: /innerHTML\s*=/g,
    severity: "HIGH",
    message: "Setting innerHTML with unsanitized input may lead to XSS",
    cwe: "CWE-79",
  },
  {
    id: "SEC004",
    pattern: /document\.write\s*\(/g,
    severity: "HIGH",
    message: "document.write() with untrusted data enables XSS",
    cwe: "CWE-79",
  },
  {
    id: "SEC005",
    pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b/gi,
    severity: "CRITICAL",
    message: "Potential SQL injection via string interpolation in queries",
    cwe: "CWE-89",
  },
  {
    id: "SEC006",
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\(/g,
    severity: "HIGH",
    message: "Command execution function detected — ensure input is sanitized",
    cwe: "CWE-78",
    languages: ["javascript", "typescript"],
  },
  {
    id: "SEC007",
    pattern: /os\.system\s*\(|subprocess\.call\s*\(/g,
    severity: "HIGH",
    message: "OS command execution — ensure input sanitization",
    cwe: "CWE-78",
    languages: ["python"],
  },

  // Hardcoded credentials
  {
    id: "SEC010",
    pattern: /(?:password|passwd|secret|api_key|apikey|token)\s*[:=]\s*["'][^"']{4,}["']/gi,
    severity: "CRITICAL",
    message: "Potential hardcoded credential or secret detected",
    cwe: "CWE-798",
  },
  {
    id: "SEC011",
    pattern: /(?:AWS_SECRET|PRIVATE_KEY|-----BEGIN\s+(?:RSA|DSA|EC)\s+PRIVATE\s+KEY-----)/g,
    severity: "CRITICAL",
    message: "Hardcoded private key or cloud credential detected",
    cwe: "CWE-798",
  },

  // Unsafe deserialization
  {
    id: "SEC020",
    pattern: /JSON\.parse\s*\(\s*(?:req\.|request\.)/g,
    severity: "MEDIUM",
    message: "Parsing untrusted input — ensure schema validation after parse",
    cwe: "CWE-502",
  },
  {
    id: "SEC021",
    pattern: /pickle\.loads?\s*\(/g,
    severity: "CRITICAL",
    message: "Pickle deserialization of untrusted data enables arbitrary code execution",
    cwe: "CWE-502",
    languages: ["python"],
  },

  // Crypto weaknesses
  {
    id: "SEC030",
    pattern: /\bMD5\b|createHash\s*\(\s*['"]md5['"]\)/gi,
    severity: "MEDIUM",
    message: "MD5 is cryptographically weak; use SHA-256 or better",
    cwe: "CWE-328",
  },
  {
    id: "SEC031",
    pattern: /\bSHA1\b|createHash\s*\(\s*['"]sha1['"]\)/gi,
    severity: "MEDIUM",
    message: "SHA-1 is deprecated for security; use SHA-256 or better",
    cwe: "CWE-328",
  },
  {
    id: "SEC032",
    pattern: /Math\.random\s*\(\)/g,
    severity: "LOW",
    message: "Math.random() is not cryptographically secure; use crypto.randomBytes()",
    cwe: "CWE-338",
    languages: ["javascript", "typescript"],
  },

  // Race conditions / TOCTOU
  {
    id: "SEC040",
    pattern: /fs\.exists(?:Sync)?\s*\(.*\)\s*[\s\S]*?fs\.(?:readFile|writeFile|unlink)/g,
    severity: "MEDIUM",
    message: "TOCTOU race condition: check-then-use pattern on filesystem",
    cwe: "CWE-367",
    languages: ["javascript", "typescript"],
  },

  // Denial of Service
  {
    id: "SEC050",
    pattern: /new\s+RegExp\s*\(\s*(?:req\.|request\.|input|user)/g,
    severity: "HIGH",
    message: "Dynamic regex from user input risks ReDoS attacks",
    cwe: "CWE-1333",
  },
  {
    id: "SEC051",
    pattern: /while\s*\(\s*true\s*\)/g,
    severity: "MEDIUM",
    message: "Infinite loop pattern — ensure break/exit condition exists",
    cwe: "CWE-835",
  },

  // Information disclosure
  {
    id: "SEC060",
    pattern: /console\.(log|error|warn|debug)\s*\(/g,
    severity: "LOW",
    message: "Console logging in production may leak sensitive information",
    cwe: "CWE-532",
  },
  {
    id: "SEC061",
    pattern: /stack\s*:\s*err\.stack|stackTrace/g,
    severity: "MEDIUM",
    message: "Exposing stack traces to clients leaks implementation details",
    cwe: "CWE-209",
  },

  // Path traversal
  {
    id: "SEC070",
    pattern: /\.\.\//g,
    severity: "MEDIUM",
    message: "Path traversal pattern detected — validate and sanitize file paths",
    cwe: "CWE-22",
  },

  // CORS
  {
    id: "SEC080",
    pattern: /Access-Control-Allow-Origin.*\*/g,
    severity: "MEDIUM",
    message: "Wildcard CORS policy — restrict to trusted origins in production",
    cwe: "CWE-942",
  },
];

// ─── Engine Entry Point ──────────────────────────────────────────────────────

export function analyzeSecurityPatterns(sourceCode: string, language: string): SecurityResult {
  const findings: SecurityFinding[] = [];
  const lines = sourceCode.split("\n");

  for (const rule of SECURITY_RULES) {
    // Skip rules that don't apply to this language
    if (rule.languages && !rule.languages.includes(language)) continue;

    // Reset lastIndex for global patterns
    rule.pattern.lastIndex = 0;

    let match;
    while ((match = rule.pattern.exec(sourceCode)) !== null) {
      const lineNumber = getLineNumber(sourceCode, match.index);

      findings.push({
        rule: rule.id,
        severity: rule.severity,
        line: lineNumber,
        pattern: match[0].substring(0, 100),
        message: rule.message,
        cwe: rule.cwe,
      });
    }

    // Reset after use
    rule.pattern.lastIndex = 0;
  }

  // Score: 100 = no issues, subtract based on severity
  const severityWeights: Record<SeverityLevel, number> = {
    INFO: 1,
    LOW: 3,
    MEDIUM: 8,
    HIGH: 15,
    CRITICAL: 25,
  };

  const totalPenalty = findings.reduce((sum, f) => sum + severityWeights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return { findings, score };
}

function getLineNumber(code: string, charIndex: number): number {
  const slice = code.substring(0, charIndex);
  return slice.split("\n").length;
}
