import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analysisApi, type Analysis, type Finding } from "../api/client";
import {
  Loader2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Shield,
  Bug,
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number | null) {
  if (s === null) return "text-gray-500";
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-yellow-400";
  return "text-red-400";
}

function severityBg(s: string) {
  switch (s) {
    case "CRITICAL": return "bg-red-500/10 text-red-400 ring-red-500/20";
    case "HIGH": return "bg-orange-500/10 text-orange-400 ring-orange-500/20";
    case "MEDIUM": return "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20";
    case "LOW": return "bg-blue-500/10 text-blue-400 ring-blue-500/20";
    case "INFO": return "bg-gray-500/10 text-gray-400 ring-gray-500/20";
    default: return "bg-gray-500/10 text-gray-400 ring-gray-500/20";
  }
}

function categoryIcon(c: string) {
  switch (c) {
    case "SECURITY": return <Shield className="h-4 w-4" />;
    case "LOGIC_ERROR": return <Bug className="h-4 w-4" />;
    case "PERFORMANCE": return <Zap className="h-4 w-4" />;
    case "EDGE_CASE": return <AlertTriangle className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
}

// ─── Score Card ──────────────────────────────────────────────────────────────

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : pct >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="card p-4">
      <span className="text-xs text-gray-400">{label}</span>
      <div className={`mt-1 text-2xl font-bold ${scoreColor(value)}`}>{value ?? "—"}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Finding Card ────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-800/50"
      >
        <div className="mt-0.5">{categoryIcon(finding.category)}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{finding.title}</span>
            <span className={`badge ring-1 ${severityBg(finding.severity)}`}>{finding.severity}</span>
            <span className="badge bg-gray-800 text-gray-400">{finding.category.replace(/_/g, " ")}</span>
            {finding.lineNumber && (
              <span className="text-xs text-gray-500">Line {finding.lineNumber}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">{finding.description}</p>
        </div>
        <div className="mt-1 text-gray-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-800 px-4 py-3">
          {finding.technicalExplanation && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Technical Explanation</h4>
              <p className="text-sm text-gray-300">{finding.technicalExplanation}</p>
            </div>
          )}
          {finding.recommendedFix && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Recommended Fix</h4>
              <p className="text-sm text-green-300">{finding.recommendedFix}</p>
            </div>
          )}
          {finding.confidenceScore !== null && (
            <div className="text-xs text-gray-500">
              Confidence: {Math.round(finding.confidenceScore * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!token || !id) return;
    const res = await analysisApi.get(id, token);
    if (res.success && res.data) {
      setAnalysis(res.data);
      // Auto-poll if still processing
      if (res.data.status === "PENDING" || res.data.status === "IN_PROGRESS") {
        setPolling(true);
      } else {
        setPolling(false);
      }
    }
    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Poll every 3s while processing
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [polling, fetchAnalysis]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card py-16 text-center">
        <p className="text-gray-400">Analysis not found</p>
        <Link to="/analyses" className="btn-primary mt-4">
          Back to list
        </Link>
      </div>
    );
  }

  const isProcessing = analysis.status === "PENDING" || analysis.status === "IN_PROGRESS";
  const findings = analysis.findings ?? [];
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/analyses" className="btn-secondary p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{analysis.fileName || "Analysis Result"}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-400">
              {analysis.language && <span className="badge bg-gray-800 text-gray-300">{analysis.language}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(analysis.createdAt).toLocaleString()}
              </span>
              {analysis.processingTimeMs && (
                <span>{(analysis.processingTimeMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analysis in progress... auto-refreshing
          </div>
        )}
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-400" />
          <div>
            <p className="text-lg font-medium">Analyzing your code...</p>
            <p className="mt-1 text-sm text-gray-400">
              The AI is reviewing for security issues, complexity, edge cases, and more.
            </p>
          </div>
        </div>
      )}

      {/* Completed results */}
      {analysis.status === "COMPLETED" && (
        <>
          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ScoreCard label="Overall Score" value={analysis.overallScore} />
            <ScoreCard label="Quality" value={analysis.qualityScore} />
            <ScoreCard label="Security" value={analysis.securityScore} />
            <ScoreCard label="Complexity" value={analysis.complexityScore} />
          </div>

          {/* Summary stats */}
          {findings.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <span className="badge bg-gray-800 text-gray-300">{findings.length} findings</span>
              {criticalCount > 0 && (
                <span className="badge bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                  {criticalCount} critical
                </span>
              )}
              {highCount > 0 && (
                <span className="badge bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                  {highCount} high
                </span>
              )}
            </div>
          )}

          {/* Findings */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Findings</h2>
            {findings.length === 0 ? (
              <div className="card py-10 text-center text-gray-400">
                No issues found — your code looks clean!
              </div>
            ) : (
              <div className="space-y-3">
                {findings
                  .sort((a, b) => {
                    const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
                    return order.indexOf(a.severity) - order.indexOf(b.severity);
                  })
                  .map((f) => (
                    <FindingCard key={f.id} finding={f} />
                  ))}
              </div>
            )}
          </div>

          {/* Source code */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Source Code</h2>
            <div className="card overflow-x-auto p-0">
              <pre className="p-4 text-sm leading-6">
                <code>
                  {analysis.sourceCode.split("\n").map((line, i) => {
                    const hasIssue = findings.some((f) => f.lineNumber === i + 1);
                    return (
                      <div key={i} className={`flex ${hasIssue ? "bg-red-500/10" : ""}`}>
                        <span className="mr-4 inline-block w-8 shrink-0 text-right text-gray-600 select-none">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre">{line}</span>
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Failed */}
      {analysis.status === "FAILED" && (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-lg font-medium text-red-400">Analysis Failed</p>
            <p className="mt-1 text-sm text-gray-400">
              Something went wrong during analysis. Please try again.
            </p>
          </div>
          <Link to="/analyze" className="btn-primary mt-2">
            Try Again
          </Link>
        </div>
      )}
    </div>
  );
}
