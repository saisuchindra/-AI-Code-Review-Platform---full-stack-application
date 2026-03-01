const BASE = "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[]> };
}

/** Extract human-readable error message from API result */
export function extractError(result: ApiResult): string {
  if (!result.error) return "Unknown error";
  // If there are field-level validation details, join them
  if (result.error.details) {
    const msgs = Object.entries(result.error.details)
      .flatMap(([_field, errs]) => errs);
    if (msgs.length > 0) return msgs.join(". ");
  }
  return result.error.message;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, token } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    return json as ApiResult<T>;
  } catch {
    return { success: false, error: { code: "NETWORK_ERROR", message: "Could not reach the server" } };
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  user: { id: string; email: string; name: string | null; role: string };
  tokens: { accessToken: string; refreshToken: string; expiresIn: string };
}

export const authApi = {
  register: (body: { email: string; password: string; name?: string }) =>
    api<AuthPayload>("/auth/register", { method: "POST", body }),

  login: (body: { email: string; password: string }) =>
    api<AuthPayload>("/auth/login", { method: "POST", body }),

  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string; expiresIn: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    }),

  profile: (token: string) =>
    api<{ id: string; email: string; name: string | null; role: string }>("/auth/profile", { token }),

  logout: (token: string) => api("/auth/logout", { method: "POST", token }),
};

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface Analysis {
  id: string;
  status: string;
  language: string | null;
  fileName: string | null;
  overallScore: number | null;
  qualityScore: number | null;
  securityScore: number | null;
  complexityScore: number | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  sourceCode: string;
  resultJson: Record<string, unknown> | null;
  findings: Finding[];
  repository?: { id: string; name: string } | null;
}

export interface Finding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  technicalExplanation: string | null;
  recommendedFix: string | null;
  lineNumber: number | null;
  confidenceScore: number | null;
}

export interface AnalysisListItem {
  id: string;
  status: string;
  language: string | null;
  fileName: string | null;
  overallScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

export const analysisApi = {
  submit: (body: { sourceCode: string; language?: string; fileName?: string }, token: string) =>
    api<{ analysisId: string; jobId: string }>("/analyses", { method: "POST", body, token }),

  get: (id: string, token: string) =>
    api<Analysis>(`/analyses/${id}`, { token }),

  list: (token: string, query = "") =>
    api<{ analyses: AnalysisListItem[]; total: number; page: number; limit: number }>(
      `/analyses${query ? `?${query}` : ""}`,
      { token }
    ),

  delete: (id: string, token: string) =>
    api(`/analyses/${id}`, { method: "DELETE", token }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardOverview {
  totalAnalyses: number;
  completedAnalyses: number;
  averageScore: number;
  totalFindings: number;
  totalRepositories: number;
  recentActivity: number;
}

export const dashboardApi = {
  overview: (token: string) => api<DashboardOverview>("/dashboard/overview", { token }),

  trends: (token: string) =>
    api<{ date: string; avgScore: number; count: number }[]>("/dashboard/trends", { token }),

  topIssues: (token: string) =>
    api<{ category: string; count: number }[]>("/dashboard/top-issues", { token }),

  recent: (token: string) =>
    api<AnalysisListItem[]>("/dashboard/recent", { token }),
};
