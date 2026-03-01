import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as dashboardController from "./dashboard.controller";

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// GET /api/v1/dashboard/overview
router.get("/overview", dashboardController.overview);

// GET /api/v1/dashboard/trends?days=30
router.get("/trends", dashboardController.trends);

// GET /api/v1/dashboard/top-issues
router.get("/top-issues", dashboardController.topIssues);

// GET /api/v1/dashboard/recent?limit=10
router.get("/recent", dashboardController.recent);

export const dashboardRoutes = router;
