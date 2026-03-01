import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as repoController from "./repo.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/repositories — Add a repository
router.post("/", repoController.add);

// GET /api/v1/repositories — List user's repositories
router.get("/", repoController.list);

// GET /api/v1/repositories/:id — Get a repository
router.get("/:id", repoController.getById);

// POST /api/v1/repositories/:id/clone — Clone a repository locally
router.post("/:id/clone", repoController.clone);

// PATCH /api/v1/repositories/:id — Update repository metadata
router.patch("/:id", repoController.update);

// DELETE /api/v1/repositories/:id — Delete a repository
router.delete("/:id", repoController.remove);

export const repoRoutes = router;
