import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardApi, type DashboardOverview, type AnalysisListItem } from "../api/client";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.26}
        fontWeight="bold"
        transform={`rotate(90,${size / 2},${size / 2})`}
      >
        {score}
      </text>
    </svg>
  );
}

function severityColor(s: string) {
  switch (s) {
    case "COMPLETED": return "text-green-400 bg-green-400/10";
    case "IN_PROGRESS": return "text-yellow-400 bg-yellow-400/10";
    case "PENDING": return "text-blue-400 bg-blue-400/10";
    case "FAILED": return "text-red-400 bg-red-400/10";
    default: return "text-gray-400 bg-gray-400/10";
  }
}

export default function Dashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recent, setRecent] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.overview(token),
      dashboardApi.recent(token),
    ]).then(([ov, rc]) => {
      if (ov.success && ov.data) setOverview(ov.data);
      if (rc.success && rc.data) setRecent(rc.data);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  const stats = overview
    ? [
        { label: "Total Analyses", value: overview.totalAnalyses, icon: BarChart3, color: "text-brand-400" },
        { label: "Completed", value: overview.completedAnalyses, icon: CheckCircle2, color: "text-green-400" },
        { label: "Avg Score", value: overview.averageScore ?? "—", icon: TrendingUp, color: "text-yellow-400" },
        { label: "Findings", value: overview.totalFindings, icon: AlertTriangle, color: "text-orange-400" },
        { label: "Repositories", value: overview.totalRepositories, icon: GitBranch, color: "text-purple-400" },
        { label: "Recent (7d)", value: overview.recentActivity, icon: Clock, color: "text-cyan-400" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Overview of your code analysis activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col items-center gap-2 p-4 text-center">
            <s.icon className={`h-6 w-6 ${s.color}`} />
            <span className="text-2xl font-bold">{s.value}</span>
            <span className="text-xs text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Avg score ring + recent table */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score ring */}
        <div className="card flex flex-col items-center justify-center gap-3 lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-400">Average Quality Score</h2>
          <ScoreRing score={overview?.averageScore ?? 0} size={140} />
          <p className="text-xs text-gray-500">Based on all completed analyses</p>
        </div>

        {/* Recent analyses */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent Analyses</h2>
            <Link
              to="/analyses"
              className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <p>No analyses yet. <Link to="/analyze" className="text-brand-400 underline">Submit your first one!</Link></p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  to={`/analyses/${a.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`badge ${severityColor(a.status)}`}>{a.status}</span>
                    <span className="text-sm font-medium">{a.fileName || "Untitled"}</span>
                    {a.language && (
                      <span className="badge bg-gray-800 text-gray-400">{a.language}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {a.overallScore !== null && (
                      <span
                        className={`font-semibold ${
                          a.overallScore >= 80
                            ? "text-green-400"
                            : a.overallScore >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {a.overallScore}
                      </span>
                    )}
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
