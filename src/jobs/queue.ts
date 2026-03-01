import { Queue } from "bullmq";
import { getRedis } from "../config/redis";
import { AnalysisJobPayload } from "../types/global.types";
import { logger } from "../utils/logger";

const QUEUE_NAME = "analysis-queue";

let analysisQueue: Queue | null = null;

export function getAnalysisQueue(): Queue {
  if (!analysisQueue) {
    analysisQueue = new Queue(QUEUE_NAME, {
      connection: getRedis() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // keep completed jobs for 24h
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // keep failed jobs for 7 days
        },
      },
    });

    logger.info("Analysis queue initialized");
  }
  return analysisQueue;
}

export async function addAnalysisJob(payload: AnalysisJobPayload): Promise<string> {
  const queue = getAnalysisQueue();

  const job = await queue.add("analyze", payload, {
    jobId: `analysis-${payload.analysisId}`,
    priority: 1,
  });

  logger.info({ jobId: job.id, analysisId: payload.analysisId }, "Job added to queue");

  return job.id!;
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getAnalysisQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function closeQueue(): Promise<void> {
  if (analysisQueue) {
    await analysisQueue.close();
    logger.info("Analysis queue closed");
  }
}
