import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { env } from "../config/env";
import { AnalysisJobPayload } from "../types/global.types";
import { executeAnalysis } from "../modules/analysis/analysis.service";
import { logger } from "../utils/logger";

const QUEUE_NAME = "analysis-queue";

let worker: Worker | null = null;

export function startAnalysisWorker(): Worker {
  if (worker) return worker;

  worker = new Worker<AnalysisJobPayload>(
    QUEUE_NAME,
    async (job: Job<AnalysisJobPayload>) => {
      logger.info(
        { jobId: job.id, analysisId: job.data.analysisId },
        "Processing analysis job"
      );

      const result = await executeAnalysis(job.data);

      // Update job progress
      await job.updateProgress(100);

      return {
        analysisId: job.data.analysisId,
        overallScore: result.overallScore,
        findingsCount:
          result.ai.logical_errors.length +
          result.ai.edge_case_risks.length +
          result.ai.architectural_weaknesses.length +
          result.ai.security_risks.length +
          result.ai.performance_risks.length +
          result.ai.concurrency_risks.length +
          result.ai.data_flow_risks.length +
          result.ai.production_hardening_gaps.length +
          result.ai.refactoring_recommendations.length,
      };
    },
    {
      connection: getRedis() as any,
      concurrency: env.QUEUE_CONCURRENCY,
      limiter: {
        max: 10,
        duration: 60_000, // max 10 jobs per minute
      },
    }
  );

  // Event handlers
  worker.on("completed", (job) => {
    logger.info(
      { jobId: job?.id, analysisId: job?.data.analysisId },
      "Analysis job completed"
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, analysisId: job?.data.analysisId, error: error.message },
      "Analysis job failed"
    );
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Analysis job stalled");
  });

  worker.on("error", (error) => {
    logger.error({ error }, "Worker error");
  });

  logger.info(
    { concurrency: env.QUEUE_CONCURRENCY },
    "Analysis worker started"
  );

  return worker;
}

export async function stopAnalysisWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("Analysis worker stopped");
  }
}
