import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analysisApi, type AnalysisListItem } from "../api/client";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-green-400/10 text-green-400",
    IN_PROGRESS: "bg-yellow-400/10 text-yellow-400",
    PENDING: "bg-blue-400/10 text-blue-400",
    FAILED: "bg-red-400/10 text-red-400",
  };
  return map[status] ?? "bg-gray-400/10 text-gray-400";
}

function scoreColor(s: number | null) {
  if (s === null) return "text-gray-500";
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function AnalysisList() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<AnalysisListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Number(params.get("page") || "1");
  const status = params.get("status") || "";
  const limit = 15;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (status) qs.set("status", status);
    qs.set("sortBy", "createdAt");
    qs.set("sortOrder", "desc");

    analysisApi.list(token, qs.toString()).then((res) => {
      if (res.success && res.data) {
        setItems(res.data.analyses);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  }, [token, page, status]);

  const totalPages = Math.ceil(total / limit);

  function setPage(p: number) {
    params.set("page", String(p));
    setParams(params);
  }

  function setFilter(s: string) {
    if (s) params.set("status", s);
    else params.delete("status");
    params.set("page", "1");
    setParams(params);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <p className="mt-1 text-sm text-gray-400">{total} total analyses</p>
        </div>
        <Link to="/analyze" className="btn-primary gap-2">
          <Plus className="h-4 w-4" /> New Analysis
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["", "COMPLETED", "IN_PROGRESS", "PENDING", "FAILED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === s
                ? "bg-brand-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No analyses found</p>
          <Link to="/analyze" className="btn-primary mt-2">
            Submit your first analysis
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((a) => (
                <tr key={a.id} className="transition hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link to={`/analyses/${a.id}`} className="font-medium text-brand-400 hover:underline">
                      {a.fileName || a.id.slice(0, 8) + "..."}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{a.language ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${scoreColor(a.overallScore)}`}>
                    {a.overallScore ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
