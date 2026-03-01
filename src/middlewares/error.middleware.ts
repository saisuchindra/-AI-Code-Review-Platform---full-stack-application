import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: env.NODE_ENV === "development" ? req.body : undefined,
    },
    "Unhandled error"
  );

  // Zod validation errors
  if (err instanceof ZodError) {
    // Build a user-friendly field → messages map stripping the "body." prefix
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      // Path is like ["body", "password"] — take the last meaningful segment
      const field = issue.path.filter((p) => p !== "body" && p !== "query" && p !== "params").join(".") || "general";
      if (!details[field]) details[field] = [];
      details[field].push(issue.message);
    }

    // Build a concise top-level message from the first issue
    const firstMsg = err.issues[0]?.message ?? "Request validation failed";

    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstMsg,
        details,
      },
    });
    return;
  }

  // Application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: env.NODE_ENV === "development" ? err.details : undefined,
      },
    });
    return;
  }

  // Prisma known request errors
  if (err.constructor?.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    if (prismaErr.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE_ENTRY",
          message: `A record with this value already exists`,
          details: prismaErr.meta?.target,
        },
      });
      return;
    }
    if (prismaErr.code === "P2025") {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Record not found" },
      });
      return;
    }
  }

  // Fallback
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
    },
  });
}
