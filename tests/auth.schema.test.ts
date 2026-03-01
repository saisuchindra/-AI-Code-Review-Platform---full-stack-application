/**
 * Auth schema (Zod) validation tests — ensure schemas accept valid input
 * and reject invalid input with the right error messages.
 */

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../src/modules/auth/auth.schema";

// ─── Register ────────────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const validReq = {
    body: {
      email: "user@example.com",
      password: "Strong@1234",
      name: "Jane Doe",
    },
  };

  it("should accept valid registration input", () => {
    expect(() => registerSchema.parse(validReq)).not.toThrow();
  });

  it("should accept without optional name", () => {
    const { name, ...bodyWithoutName } = validReq.body;
    expect(() => registerSchema.parse({ body: bodyWithoutName })).not.toThrow();
  });

  it("should reject invalid email", () => {
    expect(() =>
      registerSchema.parse({ body: { ...validReq.body, email: "not-an-email" } })
    ).toThrow();
  });

  it("should reject short password", () => {
    expect(() =>
      registerSchema.parse({ body: { ...validReq.body, password: "Ab@1" } })
    ).toThrow();
  });

  it("should reject password without uppercase", () => {
    expect(() =>
      registerSchema.parse({ body: { ...validReq.body, password: "nouppercase@1" } })
    ).toThrow();
  });

  it("should reject password without special character", () => {
    expect(() =>
      registerSchema.parse({ body: { ...validReq.body, password: "NoSpecial123" } })
    ).toThrow();
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("should accept valid login", () => {
    expect(() =>
      loginSchema.parse({ body: { email: "a@b.com", password: "any" } })
    ).not.toThrow();
  });

  it("should reject empty password", () => {
    expect(() =>
      loginSchema.parse({ body: { email: "a@b.com", password: "" } })
    ).toThrow();
  });

  it("should reject missing email", () => {
    expect(() =>
      loginSchema.parse({ body: { password: "something" } })
    ).toThrow();
  });
});

// ─── Refresh Token ───────────────────────────────────────────────────────────

describe("refreshTokenSchema", () => {
  it("should accept valid refresh token", () => {
    expect(() =>
      refreshTokenSchema.parse({ body: { refreshToken: "some.jwt.token" } })
    ).not.toThrow();
  });

  it("should reject empty refresh token", () => {
    expect(() =>
      refreshTokenSchema.parse({ body: { refreshToken: "" } })
    ).toThrow();
  });
});

// ─── Change Password ─────────────────────────────────────────────────────────

describe("changePasswordSchema", () => {
  it("should accept valid change-password input", () => {
    expect(() =>
      changePasswordSchema.parse({
        body: { currentPassword: "Old@1234", newPassword: "New@5678" },
      })
    ).not.toThrow();
  });

  it("should reject weak new password", () => {
    expect(() =>
      changePasswordSchema.parse({
        body: { currentPassword: "Old@1234", newPassword: "weak" },
      })
    ).toThrow();
  });
});

// ─── Update Profile ──────────────────────────────────────────────────────────

describe("updateProfileSchema", () => {
  it("should accept name update", () => {
    expect(() =>
      updateProfileSchema.parse({ body: { name: "New Name" } })
    ).not.toThrow();
  });

  it("should accept email update", () => {
    expect(() =>
      updateProfileSchema.parse({ body: { email: "new@email.com" } })
    ).not.toThrow();
  });

  it("should accept empty body (no changes)", () => {
    expect(() =>
      updateProfileSchema.parse({ body: {} })
    ).not.toThrow();
  });

  it("should reject invalid email", () => {
    expect(() =>
      updateProfileSchema.parse({ body: { email: "bad-email" } })
    ).toThrow();
  });
});
