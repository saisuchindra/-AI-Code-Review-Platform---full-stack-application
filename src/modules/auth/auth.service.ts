import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { logger } from "../../utils/logger";
import { blacklistToken } from "../../utils/cache";
import { ServiceResult } from "../../types/global.types";
import { RegisterInput, LoginInput, ChangePasswordInput, UpdateProfileInput } from "./auth.schema";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface AuthPayload {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tokens: TokenPair;
}

function generateTokens(userId: string, role: string): TokenPair {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign({ userId, role, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });

  return { accessToken, refreshToken, expiresIn: env.JWT_EXPIRES_IN };
}

export async function registerUser(input: RegisterInput): Promise<ServiceResult<AuthPayload>> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return {
      ok: false,
      error: { code: "EMAIL_EXISTS", message: "Email already registered", statusCode: 409 },
    };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name ?? null,
    },
  });

  const tokens = generateTokens(user.id, user.role);

  // Store refresh token hash
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  logger.info({ userId: user.id }, "User registered");

  return {
    ok: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    },
  };
}

export async function loginUser(input: LoginInput): Promise<ServiceResult<AuthPayload>> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    return {
      ok: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", statusCode: 401 },
    };
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    return {
      ok: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", statusCode: 401 },
    };
  }

  const tokens = generateTokens(user.id, user.role);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken: tokens.refreshToken,
      lastLoginAt: new Date(),
    },
  });

  logger.info({ userId: user.id }, "User logged in");

  return {
    ok: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    },
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<ServiceResult<TokenPair>> {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      userId: string;
      role: string;
      type: string;
    };

    if (decoded.type !== "refresh") {
      return {
        ok: false,
        error: { code: "INVALID_TOKEN", message: "Invalid refresh token", statusCode: 401 },
      };
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      return {
        ok: false,
        error: { code: "INVALID_TOKEN", message: "Refresh token revoked or invalid", statusCode: 401 },
      };
    }

    const tokens = generateTokens(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return { ok: true, data: tokens };
  } catch {
    return {
      ok: false,
      error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token", statusCode: 401 },
    };
  }
}

export async function logoutUser(userId: string, accessToken?: string): Promise<ServiceResult<{ message: string }>> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  // Blacklist current access token for remaining TTL
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await blacklistToken(accessToken, ttl);
        }
      }
    } catch {
      // Non-critical — token may already be expired
    }
  }

  return { ok: true, data: { message: "Logged out successfully" } };
}

export async function getProfile(userId: string): Promise<ServiceResult<any>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true, lastLoginAt: true },
  });

  if (!user) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "User not found", statusCode: 404 },
    };
  }

  return { ok: true, data: user };
}

// ─── Change Password ─────────────────────────────────────────────────────────

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<ServiceResult<{ message: string }>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "User not found", statusCode: 404 },
    };
  }

  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isValid) {
    return {
      ok: false,
      error: { code: "INVALID_PASSWORD", message: "Current password is incorrect", statusCode: 400 },
    };
  }

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, refreshToken: null }, // Invalidate all sessions
  });

  logger.info({ userId }, "Password changed");
  return { ok: true, data: { message: "Password changed successfully" } };
}

// ─── Update Profile ──────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<ServiceResult<any>> {
  // Check email uniqueness if changing email
  if (input.email) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
    });
    if (existing) {
      return {
        ok: false,
        error: { code: "EMAIL_EXISTS", message: "Email already in use", statusCode: 409 },
      };
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  logger.info({ userId }, "Profile updated");
  return { ok: true, data: updatedUser };
}
