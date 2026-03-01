import app from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { disconnectRedis } from "./config/redis";
import { startAnalysisWorker, stopAnalysisWorker } from "./jobs/analysis.processor";
import { closeQueue } from "./jobs/queue";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start BullMQ worker
  startAnalysisWorker();

  // Start HTTP server
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      `🚀 AI Code Review Platform running on http://${env.HOST}:${env.PORT}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");

    server.close(async () => {
      logger.info("HTTP server closed");

      await stopAnalysisWorker();
      await closeQueue();
      await disconnectRedis();
      await disconnectDatabase();

      logger.info("All connections closed. Exiting.");
      process.exit(0);
    });

    // Force exit after 30s
    setTimeout(() => {
      logger.error("Graceful shutdown timed out. Forcing exit.");
      process.exit(1);
    }, 30_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Unhandled rejection / exception handlers
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught exception");
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Failed to start application");
  process.exit(1);
});
