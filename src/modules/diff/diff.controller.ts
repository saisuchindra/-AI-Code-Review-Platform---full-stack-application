import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../types/global.types";
import * as diffService from "./diff.service";

const parseDiffSchema = z.object({
  body: z.object({
    rawDiff: z.string().min(1, "Diff content is required").max(2_000_000),
  }),
});

const commitDiffSchema = z.object({
  params: z.object({
    repoId: z.string().uuid(),
  }),
  query: z.object({
    from: z.string().min(1, "from commit SHA required"),
    to: z.string().min(1, "to commit SHA required"),
  }),
});

const workingDiffSchema = z.object({
  params: z.object({
    repoId: z.string().uuid(),
  }),
});

export async function parse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = parseDiffSchema.parse(req);
    const result = await diffService.parseRawDiff(body.rawDiff);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function commitDiff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params, query } = commitDiffSchema.parse(req);
    const result = await diffService.getDiffBetweenCommits(params.repoId, req.userId!, query.from, query.to);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function workingDiff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = workingDiffSchema.parse(req);
    const result = await diffService.getWorkingDiff(params.repoId, req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}
