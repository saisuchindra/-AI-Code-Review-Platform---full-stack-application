import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../types/global.types";
import { isTokenBlacklisted } from "../utils/cache";
import { logger } from "../utils/logger";

interface JwtPayload {
  userId: string;
  role: "USER" | "ADMIN";
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Check blacklist
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      res.status(401).json({
        success: false,
        error: { code: "TOKEN_REVOKED", message: "Token has been revoked" },
      });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    logger.warn({ error }, "JWT verification failed");

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access token has expired" },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid access token" },
    });
  }
}

export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
    return;
  }
  next();
}
