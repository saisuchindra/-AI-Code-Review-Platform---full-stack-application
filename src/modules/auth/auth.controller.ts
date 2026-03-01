import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../types/global.types";
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema } from "./auth.schema";
import * as authService from "./auth.service";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = registerSchema.parse(req);
    const result = await authService.registerUser(body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = loginSchema.parse(req);
    const result = await authService.loginUser(body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = refreshTokenSchema.parse(req);
    const result = await authService.refreshAccessToken(body.refreshToken);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.slice(7);
    const result = await authService.logoutUser(req.userId!, token);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function profile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.getProfile(req.userId!);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = changePasswordSchema.parse(req);
    const result = await authService.changePassword(req.userId!, body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = updateProfileSchema.parse(req);
    const result = await authService.updateProfile(req.userId!, body);

    if (!result.ok) {
      res.status(result.error.statusCode).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
}
