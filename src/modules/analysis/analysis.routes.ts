import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { analysisRateLimiter } from "../../middlewares/rateLimiter.middleware";
import { submitAnalysisSchema, getAnalysisSchema, listAnalysesSchema } from "./analysis.validator";
import * as analysisController from "./analysis.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/analyses — Submit new analysis
router.post(
  "/",
  analysisRateLimiter,
  validate(submitAnalysisSchema),
  analysisController.submit
);

// GET /api/v1/analyses — List analyses with pagination
router.get(
  "/",
  validate(listAnalysesSchema),
  analysisController.list
);

// GET /api/v1/analyses/:id — Get single analysis by ID
router.get(
  "/:id",
  validate(getAnalysisSchema),
  analysisController.getById
);

// DELETE /api/v1/analyses/:id — Delete analysis
router.delete(
  "/:id",
  validate(getAnalysisSchema),
  analysisController.remove
);

export const analysisRoutes = router;
