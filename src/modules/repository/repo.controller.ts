import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../types/global.types";
import * as repoService from "./repo.service";

const addRepoSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    url: z.string().url("Invalid repository URL"),
    branch: z.string().max(200).optional(),
    language: z.string().max(50).optional(),
  }),
});

const repoIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const listRepoSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export async function add(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = addRepoSchema.parse(req);
    const result = await repoService.addRepository(req.userId!, body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = repoIdSchema.parse(req);
    const result = await repoService.getRepository(params.id, req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = listRepoSchema.parse(req);
    const result = await repoService.listRepositories(req.userId!, query.page, query.limit);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, ...result.data });
  } catch (error) {
    next(error);
  }
}

export async function clone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = repoIdSchema.parse(req);
    const result = await repoService.cloneRepository(params.id, req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const updateRepoSchema = z.object({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).max(200).optional(),
        branch: z.string().max(200).optional(),
        language: z.string().max(50).optional(),
      }),
    });
    const { params, body } = updateRepoSchema.parse(req);
    const result = await repoService.updateRepository(params.id, req.userId!, body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = repoIdSchema.parse(req);
    const result = await repoService.deleteRepository(params.id, req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}
