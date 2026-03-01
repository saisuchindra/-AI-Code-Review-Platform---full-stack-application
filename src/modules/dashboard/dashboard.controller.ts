import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../types/global.types";
import * as dashboardService from "./dashboard.service";

/**
 * GET /api/v1/dashboard/overview — User's analysis overview stats
 */
export async function overview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dashboardService.getUserOverview(req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/dashboard/trends — Analysis score trends over time
 */
export async function trends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    const result = await dashboardService.getScoreTrends(req.userId!, days);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/dashboard/top-issues — Most common issue categories
 */
export async function topIssues(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dashboardService.getTopIssues(req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/dashboard/recent — Recent analysis results
 */
export async function recent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
    const result = await dashboardService.getRecentAnalyses(req.userId!, limit);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}
