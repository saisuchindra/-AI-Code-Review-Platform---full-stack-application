import { Router } from "express";
import * as webhookController from "./webhook.controller";

const router = Router();

// POST /api/v1/webhooks/github — GitHub webhook receiver
router.post("/github", webhookController.handleGitHub);

export const webhookRoutes = router;
