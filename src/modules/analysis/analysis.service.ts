import { ServiceResult, AnalysisJobPayload } from "../../types/global.types";
import { FullAnalysisResult } from "../../types/analysis.types";
import { detectLanguage } from "../../utils/languageDetector";
import { logger } from "../../utils/logger";
import * as analysisRepo from "./analysis.repository";
import { analyzeComplexity } from "./complexity.engine";
import { analyzeSecurityPatterns } from "./security.engine";
import { analyzeWithAI } from "./ai.engine";
import { addAnalysisJob } from "../../jobs/queue";
import { SubmitAnalysisInput, ListAnalysesQuery } from "./analysis.validator";

// ─── Submit Analysis (queue-based) ──────────────────────────────────────────

export async function submitAnalysis(
  userId: string,
  input: SubmitAnalysisInput
): Promise<ServiceResult<{ analysisId: string; status: string }>> {
  // Auto-detect language if not provided
  let language = input.language;
  if (!language && input.fileName) {
    const detected = detectLanguage(input.fileName, input.sourceCode);
    language = detected.language;
  }
  if (!language) {
    const detected = detectLanguage("file.txt", input.sourceCode);
    language = detected.language !== "unknown" ? detected.language : "javascript";
  }

  // Create pending analysis record
  const analysis = await analysisRepo.createAnalysis({
    userId,
    sourceCode: input.sourceCode,
    language,
    fileName: input.fileName,
    repositoryId: input.repositoryId,
    commitSha: input.commitSha,
  });

  // Enqueue for background processing
  const jobPayload: AnalysisJobPayload = {
    analysisId: analysis.id,
    userId,
    sourceCode: input.sourceCode,
    language,
    fileName: input.fileName,
    repositoryId: input.repositoryId,
  };

  await addAnalysisJob(jobPayload);

  logger.info({ analysisId: analysis.id, language }, "Analysis submitted to queue");

  return {
    ok: true,
    data: { analysisId: analysis.id, status: "PENDING" },
  };
}

// ─── Execute Analysis (called by worker) ─────────────────────────────────────

export async function executeAnalysis(payload: AnalysisJobPayload): Promise<FullAnalysisResult> {
  const { analysisId, sourceCode, language } = payload;

  if (!sourceCode || !language) {
    throw new Error("Missing sourceCode or language in analysis payload");
  }

  // Mark as in-progress
  await analysisRepo.updateAnalysisStatus(analysisId, "IN_PROGRESS", {
    startedAt: new Date(),
  });

  const startTime = Date.now();

  try {
    // Layer 1: Static complexity analysis
    const complexityResult = analyzeComplexity(sourceCode, language);

    // Layer 2: Security pattern scan
    const securityResult = analyzeSecurityPatterns(sourceCode, language);

    // Layer 3: AI deep semantic review
    const aiResult = await analyzeWithAI(sourceCode, language, complexityResult);

    // Compute composite scores
    const qualityScore = Math.round(
      aiResult.analysis_metadata.confidence_score * 100
    );
    const securityScore = securityResult.score;
    const complexityScore = complexityResult.score;
    const overallScore = Math.round(
      qualityScore * 0.4 + securityScore * 0.35 + complexityScore * 0.25
    );

    const processingTimeMs = Date.now() - startTime;

    // Store findings
    const findingCount = await analysisRepo.storeFindings(analysisId, aiResult);

    // Update analysis record
    await analysisRepo.updateAnalysisStatus(analysisId, "COMPLETED", {
      completedAt: new Date(),
      processingTimeMs,
      resultJson: aiResult as any,
      complexityScore,
      securityScore,
      qualityScore,
      overallScore,
    });

    logger.info(
      { analysisId, processingTimeMs, findingCount, overallScore },
      "Analysis completed"
    );

    return {
      ai: aiResult,
      complexity: complexityResult,
      security: securityResult,
      overallScore,
      qualityScore,
      securityScore,
      complexityScore,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    await analysisRepo.updateAnalysisStatus(analysisId, "FAILED", {
      completedAt: new Date(),
      processingTimeMs,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    logger.error({ analysisId, error }, "Analysis execution failed");
    throw error;
  }
}

// ─── Get Analysis ────────────────────────────────────────────────────────────

export async function getAnalysis(
  analysisId: string,
  userId: string
): Promise<ServiceResult<any>> {
  const analysis = await analysisRepo.findAnalysisById(analysisId, userId);
  if (!analysis) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Analysis not found", statusCode: 404 },
    };
  }

  return { ok: true, data: analysis };
}

// ─── List Analyses ───────────────────────────────────────────────────────────

export async function listAnalyses(
  userId: string,
  query: ListAnalysesQuery
): Promise<ServiceResult<any>> {
  const { analyses, total } = await analysisRepo.listAnalyses(userId, {
    page: query.page,
    limit: query.limit,
    status: query.status as any,
    repositoryId: query.repositoryId,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  return {
    ok: true,
    data: {
      analyses,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    },
  };
}

// ─── Delete Analysis ─────────────────────────────────────────────────────────

export async function deleteAnalysis(
  analysisId: string,
  userId: string
): Promise<ServiceResult<{ message: string }>> {
  const deleted = await analysisRepo.deleteAnalysis(analysisId, userId);
  if (!deleted) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Analysis not found", statusCode: 404 },
    };
  }

  return { ok: true, data: { message: "Analysis deleted" } };
}
