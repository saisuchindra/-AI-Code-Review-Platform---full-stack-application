import { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger";
import { computeHmacSha256, timingSafeEqual } from "../../utils/crypto";
import * as webhookService from "./webhook.service";

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

/**
 * Handles incoming GitHub webhook events (push, pull_request).
 */
export async function handleGitHub(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Verify signature
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature || !GITHUB_WEBHOOK_SECRET) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing webhook signature" } });
      return;
    }

    const rawBody = JSON.stringify(req.body);
    const expected = computeHmacSha256(rawBody, GITHUB_WEBHOOK_SECRET);

    if (!timingSafeEqual(signature, expected)) {
      logger.warn("GitHub webhook signature mismatch");
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Invalid webhook signature" } });
      return;
    }

    const event = req.headers["x-github-event"] as string;
    const deliveryId = req.headers["x-github-delivery"] as string;

    logger.info({ event, deliveryId }, "GitHub webhook received");

    switch (event) {
      case "push":
        await webhookService.handlePushEvent(req.body);
        break;

      case "pull_request":
        await webhookService.handlePullRequestEvent(req.body);
        break;

      case "ping":
        logger.info("GitHub webhook ping received");
        break;

      default:
        logger.info({ event }, "Unhandled GitHub webhook event");
    }

    res.status(200).json({ success: true, data: { received: true, event, deliveryId } });
  } catch (error) {
    next(error);
  }
}
