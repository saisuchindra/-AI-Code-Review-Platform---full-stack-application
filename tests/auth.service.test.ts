/**
 * Auth service unit tests.
 *
 * We mock the Prisma client and Redis so these tests run without external
 * infrastructure — pure logic verification.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "USER",
  passwordHash: "", // set per-test
  refreshToken: null as string | null,
  createdAt: new Date(),
  lastLoginAt: null as Date | null,
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../src/config/database", () => ({
  prisma: prismaMock,
}));

// ─── Mock Redis / cache ──────────────────────────────────────────────────────
jest.mock("../src/utils/cache", () => ({
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

// ─── Mock env ────────────────────────────────────────────────────────────────
jest.mock("../src/config/env", () => ({
  env: {
    JWT_SECRET: "test-jwt-secret-that-is-long-enough",
    JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    NODE_ENV: "test",
  },
}));

// ─── Mock logger ─────────────────────────────────────────────────────────────
jest.mock("../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import * as authService from "../src/modules/auth/auth.service";
import { hashPassword } from "../src/utils/hash";

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe("registerUser", () => {
  it("should create a new user and return tokens", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null); // no existing user
    prismaMock.user.create.mockResolvedValue({ ...mockUser });
    prismaMock.user.update.mockResolvedValue({ ...mockUser });

    const result = await authService.registerUser({
      email: "test@example.com",
      password: "Test@1234",
      name: "Test User",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.email).toBe("test@example.com");
      expect(result.data.tokens.accessToken).toBeDefined();
      expect(result.data.tokens.refreshToken).toBeDefined();
      expect(result.data.tokens.expiresIn).toBe("15m");
    }

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1); // saves refresh token
  });

  it("should reject duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser });

    const result = await authService.registerUser({
      email: "test@example.com",
      password: "Test@1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_EXISTS");
      expect(result.error.statusCode).toBe(409);
    }
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe("loginUser", () => {
  it("should return tokens for valid credentials", async () => {
    const hash = await hashPassword("Test@1234");
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
    prismaMock.user.update.mockResolvedValue({ ...mockUser });

    const result = await authService.loginUser({
      email: "test@example.com",
      password: "Test@1234",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe("user-1");
      expect(result.data.tokens.accessToken).toBeTruthy();
    }
  });

  it("should reject unknown email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await authService.loginUser({
      email: "nobody@example.com",
      password: "Test@1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CREDENTIALS");
      expect(result.error.statusCode).toBe(401);
    }
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("CorrectP@ss1");
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

    const result = await authService.loginUser({
      email: "test@example.com",
      password: "WrongP@ss1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CREDENTIALS");
    }
  });
});

// ─── Refresh ─────────────────────────────────────────────────────────────────

describe("refreshAccessToken", () => {
  it("should return INVALID_TOKEN for garbage token", async () => {
    const result = await authService.refreshAccessToken("not-a-valid-jwt");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TOKEN");
    }
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────

describe("logoutUser", () => {
  it("should clear refresh token", async () => {
    prismaMock.user.update.mockResolvedValue({ ...mockUser, refreshToken: null });

    const result = await authService.logoutUser("user-1");

    expect(result.ok).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshToken: null },
    });
  });
});

// ─── Change Password ─────────────────────────────────────────────────────────

describe("changePassword", () => {
  it("should change password for correct current password", async () => {
    const hash = await hashPassword("OldP@ss123");
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
    prismaMock.user.update.mockResolvedValue({ ...mockUser });

    const result = await authService.changePassword("user-1", {
      currentPassword: "OldP@ss123",
      newPassword: "NewP@ss456",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toContain("Password changed");
    }
    // Should invalidate sessions
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refreshToken: null }),
      })
    );
  });

  it("should reject incorrect current password", async () => {
    const hash = await hashPassword("ActualP@ss1");
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

    const result = await authService.changePassword("user-1", {
      currentPassword: "WrongP@ss1",
      newPassword: "NewP@ss456",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PASSWORD");
    }
  });
});

// ─── Update Profile ──────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("should update name", async () => {
    prismaMock.user.update.mockResolvedValue({ ...mockUser, name: "New Name" });

    const result = await authService.updateProfile("user-1", { name: "New Name" });

    expect(result.ok).toBe(true);
  });

  it("should reject duplicate email", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "other-user" });

    const result = await authService.updateProfile("user-1", {
      email: "taken@example.com",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_EXISTS");
    }
  });
});

// ─── Get Profile ─────────────────────────────────────────────────────────────

describe("getProfile", () => {
  it("should return user data", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
      createdAt: new Date(),
      lastLoginAt: null,
    });

    const result = await authService.getProfile("user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("should return NOT_FOUND for missing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await authService.getProfile("nonexistent");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
