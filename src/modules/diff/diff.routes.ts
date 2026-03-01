import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as diffController from "./diff.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/diff/parse — Parse raw unified diff text
router.post("/parse", diffController.parse);

// GET /api/v1/diff/:repoId/commits — Get diff between two commits
router.get("/:repoId/commits", diffController.commitDiff);

// GET /api/v1/diff/:repoId/working — Get working tree diff
router.get("/:repoId/working", diffController.workingDiff);

export const diffRoutes = router;
