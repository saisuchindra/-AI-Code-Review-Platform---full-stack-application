import { Request } from "express";

// ─── Authenticated Request ───────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: "USER" | "ADMIN";
}

// ─── Standard API Response ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Service Result (Railway-oriented) ───────────────────────────────────────

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// ─── Job Payload ─────────────────────────────────────────────────────────────

export interface AnalysisJobPayload {
  analysisId: string;
  userId: string;
  sourceCode?: string;
  language?: string;
  fileName?: string;
  repositoryId?: string;
  commitSha?: string;
  diffContent?: string;
}
