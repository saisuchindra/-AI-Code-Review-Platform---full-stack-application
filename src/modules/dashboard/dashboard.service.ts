import { prisma } from "../../config/database";
import { ServiceResult } from "../../types/global.types";
import { cache } from "../../utils/cache";
import { logger } from "../../utils/logger";

// ─── User Overview Stats ─────────────────────────────────────────────────────

interface OverviewData {
  totalAnalyses: number;
  completedAnalyses: number;
  failedAnalyses: number;
  pendingAnalyses: number;
  averageOverallScore: number | null;
  averageSecurityScore: number | null;
  averageComplexityScore: number | null;
  totalRepositories: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
}

export async function getUserOverview(userId: string): Promise<ServiceResult<OverviewData>> {
  const cacheKey = `dashboard:overview:${userId}`;
  const cached = await cache.get<OverviewData>(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const [
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      pendingAnalyses,
      scoreAgg,
      totalRepositories,
      totalFindings,
      criticalFindings,
      highFindings,
    ] = await prisma.$transaction([
      prisma.analysis.count({ where: { userId } }),
      prisma.analysis.count({ where: { userId, status: "COMPLETED" } }),
      prisma.analysis.count({ where: { userId, status: "FAILED" } }),
      prisma.analysis.count({ where: { userId, status: "PENDING" } }),
      prisma.analysis.aggregate({
        where: { userId, status: "COMPLETED" },
        _avg: {
          overallScore: true,
          securityScore: true,
          complexityScore: true,
        },
      }),
      prisma.repository.count({ where: { userId } }),
      prisma.finding.count({
        where: { analysis: { userId } },
      }),
      prisma.finding.count({
        where: { analysis: { userId }, severity: "CRITICAL" },
      }),
      prisma.finding.count({
        where: { analysis: { userId }, severity: "HIGH" },
      }),
    ]);

    const data: OverviewData = {
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      pendingAnalyses,
      averageOverallScore: scoreAgg._avg.overallScore
        ? Math.round(scoreAgg._avg.overallScore * 100) / 100
        : null,
      averageSecurityScore: scoreAgg._avg.securityScore
        ? Math.round(scoreAgg._avg.securityScore * 100) / 100
        : null,
      averageComplexityScore: scoreAgg._avg.complexityScore
        ? Math.round(scoreAgg._avg.complexityScore * 100) / 100
        : null,
      totalRepositories,
      totalFindings,
      criticalFindings,
      highFindings,
    };

    await cache.set(cacheKey, data, 120); // Cache for 2 minutes
    return { ok: true, data };
  } catch (error) {
    logger.error({ userId, error }, "Failed to fetch dashboard overview");
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch overview", statusCode: 500 },
    };
  }
}

// ─── Score Trends ────────────────────────────────────────────────────────────

interface TrendPoint {
  date: string;
  averageScore: number;
  count: number;
}

export async function getScoreTrends(
  userId: string,
  days: number
): Promise<ServiceResult<TrendPoint[]>> {
  const cacheKey = `dashboard:trends:${userId}:${days}`;
  const cached = await cache.get<TrendPoint[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const analyses = await prisma.analysis.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: since },
        overallScore: { not: null },
      },
      select: {
        completedAt: true,
        overallScore: true,
      },
      orderBy: { completedAt: "asc" },
    });

    // Group by date
    const grouped = new Map<string, { total: number; count: number }>();
    for (const a of analyses) {
      const date = a.completedAt!.toISOString().split("T")[0];
      const existing = grouped.get(date) || { total: 0, count: 0 };
      existing.total += a.overallScore!;
      existing.count += 1;
      grouped.set(date, existing);
    }

    const data: TrendPoint[] = Array.from(grouped.entries()).map(([date, { total, count }]) => ({
      date,
      averageScore: Math.round((total / count) * 100) / 100,
      count,
    }));

    await cache.set(cacheKey, data, 300);
    return { ok: true, data };
  } catch (error) {
    logger.error({ userId, error }, "Failed to fetch score trends");
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch trends", statusCode: 500 },
    };
  }
}

// ─── Top Issues ──────────────────────────────────────────────────────────────

interface IssueSummary {
  category: string;
  severity: string;
  count: number;
}

export async function getTopIssues(userId: string): Promise<ServiceResult<IssueSummary[]>> {
  const cacheKey = `dashboard:top-issues:${userId}`;
  const cached = await cache.get<IssueSummary[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const findings = await prisma.finding.groupBy({
      by: ["category", "severity"],
      where: { analysis: { userId } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const data: IssueSummary[] = findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      count: f._count.id,
    }));

    await cache.set(cacheKey, data, 300);
    return { ok: true, data };
  } catch (error) {
    logger.error({ userId, error }, "Failed to fetch top issues");
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch top issues", statusCode: 500 },
    };
  }
}

// ─── Recent Analyses ─────────────────────────────────────────────────────────

export async function getRecentAnalyses(userId: string, limit: number): Promise<ServiceResult<any[]>> {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        language: true,
        fileName: true,
        overallScore: true,
        securityScore: true,
        complexityScore: true,
        qualityScore: true,
        processingTimeMs: true,
        triggerType: true,
        createdAt: true,
        completedAt: true,
        _count: { select: { findings: true } },
      },
    });

    return { ok: true, data: analyses };
  } catch (error) {
    logger.error({ userId, error }, "Failed to fetch recent analyses");
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch recent analyses", statusCode: 500 },
    };
  }
}
