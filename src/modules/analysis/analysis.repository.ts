import { prisma } from "../../config/database";
import { Prisma, Analysis, Finding, AnalysisStatus, FindingCategory, Severity } from "@prisma/client";
import { AIAnalysisResult, FindingItem } from "../../types/analysis.types";

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createAnalysis(data: {
  userId: string;
  repositoryId?: string;
  sourceCode?: string;
  language?: string;
  fileName?: string;
  commitSha?: string;
  diffContent?: string;
  triggerType?: "MANUAL" | "PUSH" | "PULL_REQUEST" | "SCHEDULED";
}): Promise<Analysis> {
  return prisma.analysis.create({
    data: {
      userId: data.userId,
      repositoryId: data.repositoryId,
      sourceCode: data.sourceCode,
      language: data.language,
      fileName: data.fileName,
      commitSha: data.commitSha,
      diffContent: data.diffContent,
      triggerType: data.triggerType ?? "MANUAL",
      status: "PENDING",
    },
  });
}

// ─── Update Status ───────────────────────────────────────────────────────────

export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus,
  extra?: Partial<{
    startedAt: Date;
    completedAt: Date;
    errorMessage: string;
    processingTimeMs: number;
    resultJson: Prisma.InputJsonValue;
    complexityScore: number;
    securityScore: number;
    qualityScore: number;
    overallScore: number;
  }>
): Promise<Analysis> {
  return prisma.analysis.update({
    where: { id },
    data: { status, ...extra },
  });
}

// ─── Store Findings ──────────────────────────────────────────────────────────

export async function storeFindings(
  analysisId: string,
  aiResult: AIAnalysisResult
): Promise<number> {
  const findings: Prisma.FindingCreateManyInput[] = [];

  const categoryMap: {
    key: keyof AIAnalysisResult;
    category: FindingCategory;
  }[] = [
    { key: "logical_errors", category: "LOGICAL_ERROR" },
    { key: "edge_case_risks", category: "EDGE_CASE" },
    { key: "architectural_weaknesses", category: "ARCHITECTURE" },
    { key: "security_risks", category: "SECURITY" },
    { key: "performance_risks", category: "PERFORMANCE" },
    { key: "concurrency_risks", category: "CONCURRENCY" },
    { key: "data_flow_risks", category: "DATA_FLOW" },
    { key: "production_hardening_gaps", category: "PRODUCTION_HARDENING" },
    { key: "refactoring_recommendations", category: "REFACTORING" },
  ];

  for (const { key, category } of categoryMap) {
    const items = aiResult[key] as FindingItem[];
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      findings.push({
        analysisId,
        category,
        severity: mapSeverity(item.severity),
        title: item.issue,
        description: item.technical_explanation,
        technicalExplanation: item.technical_explanation,
        recommendedFix: item.recommended_fix,
        lineNumber: item.line_number,
        confidenceScore: aiResult.analysis_metadata.confidence_score,
      });
    }
  }

  if (findings.length > 0) {
    await prisma.finding.createMany({ data: findings });
  }

  return findings.length;
}

function mapSeverity(severity: string): Severity {
  const map: Record<string, Severity> = {
    INFO: "INFO",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  };
  return map[severity] ?? "INFO";
}

// ─── Query ───────────────────────────────────────────────────────────────────

export async function findAnalysisById(
  id: string,
  userId: string
): Promise<(Analysis & { findings: Finding[] }) | null> {
  return prisma.analysis.findFirst({
    where: { id, userId },
    include: {
      findings: {
        orderBy: [
          { severity: "desc" },
          { createdAt: "asc" },
        ],
      },
    },
  });
}

export async function listAnalyses(
  userId: string,
  options: {
    page: number;
    limit: number;
    status?: AnalysisStatus;
    repositoryId?: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }
): Promise<{ analyses: Analysis[]; total: number }> {
  const where: Prisma.AnalysisWhereInput = {
    userId,
    ...(options.status && { status: options.status }),
    ...(options.repositoryId && { repositoryId: options.repositoryId }),
  };

  const [analyses, total] = await prisma.$transaction([
    prisma.analysis.findMany({
      where,
      orderBy: { [options.sortBy]: options.sortOrder },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      include: {
        _count: { select: { findings: true } },
      },
    }),
    prisma.analysis.count({ where }),
  ]);

  return { analyses, total };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAnalysis(id: string, userId: string): Promise<boolean> {
  const analysis = await prisma.analysis.findFirst({ where: { id, userId } });
  if (!analysis) return false;

  await prisma.analysis.delete({ where: { id } });
  return true;
}
