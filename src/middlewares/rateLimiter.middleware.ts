import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).userId ?? req.ip ?? "unknown";
  },
});

export const analysisRateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 analyses per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "ANALYSIS_RATE_LIMIT",
      message: "Too many analysis requests. Max 10 per minute.",
    },
  },
  keyGenerator: (req) => {
    return (req as any).userId ?? req.ip ?? "unknown";
  },
});
