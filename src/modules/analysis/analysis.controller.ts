import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../types/global.types";
import {
  submitAnalysisSchema,
  getAnalysisSchema,
  listAnalysesSchema,
} from "./analysis.validator";
import * as analysisService from "./analysis.service";

export async function submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = submitAnalysisSchema.parse(req);
    const result = await analysisService.submitAnalysis(req.userId!, body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(202).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = getAnalysisSchema.parse(req);
    const result = await analysisService.getAnalysis(params.id, req.userId!);

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
    const { query } = listAnalysesSchema.parse(req);
    const result = await analysisService.listAnalyses(req.userId!, query);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, ...result.data });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = getAnalysisSchema.parse(req);
    const result = await analysisService.deleteAnalysis(params.id, req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}
