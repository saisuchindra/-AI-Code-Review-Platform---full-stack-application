import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();
  const startTime = Date.now();

  // Attach request ID to response
  res.setHeader("x-request-id", requestId);

  // Log on response finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.getHeader("content-length"),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      userId: (req as any).userId,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, "Request completed with server error");
    } else if (res.statusCode >= 400) {
      logger.warn(logData, "Request completed with client error");
    } else {
      logger.info(logData, "Request completed");
    }
  });

  next();
}
