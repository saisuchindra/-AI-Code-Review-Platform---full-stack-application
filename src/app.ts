import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { requestLogger } from "./middlewares/logger.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware";
import { sanitize } from "./middlewares/sanitize.middleware";
import { authMiddleware, adminOnly } from "./middlewares/auth.middleware";

// Route module imports
import { authRoutes } from "./modules/auth/auth.routes";
import { analysisRoutes } from "./modules/analysis/analysis.routes";
import { repoRoutes } from "./modules/repository/repo.routes";
import { diffRoutes } from "./modules/diff/diff.routes";
import { webhookRoutes } from "./modules/webhook/webhook.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";

import { getQueueStats } from "./jobs/queue";
import { prisma } from "./config/database";
import { getRedis } from "./config/redis";
import { env } from "./config/env";

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS Configuration ─────────────────────────────────────────────────────

app.use(cors({
  origin: env.NODE_ENV === "production"
    ? (process.env.CORS_ORIGINS?.split(",") || [])
    : "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
  credentials: true,
  maxAge: 86400,
}));

// ─── Body Parsing & Compression ──────────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);

// ─── Logging & Rate Limiting ─────────────────────────────────────────────────

app.use(requestLogger);
app.use(globalRateLimiter);

// ─── Trust Proxy (for rate limiting behind reverse proxy) ────────────────────

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ─── Health Check (public) ───────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    },
  });
});

// ─── Deep Health Check (includes DB + Redis) ─────────────────────────────────

app.get("/health/deep", async (_req, res) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "unhealthy" };
  }

  // Redis check
  try {
    const redisStart = Date.now();
    const redis = getRedis();
    await redis.ping();
    checks.redis = { status: "healthy", latencyMs: Date.now() - redisStart };
  } catch {
    checks.redis = { status: "unhealthy" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
  });
});

// ─── API v1 Routes ───────────────────────────────────────────────────────────

const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/analyses`, analysisRoutes);
app.use(`${API_PREFIX}/repositories`, repoRoutes);
app.use(`${API_PREFIX}/diff`, diffRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// ─── Admin Routes ────────────────────────────────────────────────────────────

app.get(`${API_PREFIX}/admin/queue-stats`, authMiddleware, adminOnly, async (_req, res, next) => {
  try {
    const stats = await getQueueStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorMiddleware);

export default app;
