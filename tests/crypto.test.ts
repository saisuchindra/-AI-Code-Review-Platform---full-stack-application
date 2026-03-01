/**
 * Crypto utility tests — HMAC verification, timing-safe compare, random strings.
 */

import { computeHmacSha256, timingSafeEqual, secureRandomString } from "../src/utils/crypto";

describe("computeHmacSha256", () => {
  const secret = "webhook-secret";

  it("should produce a valid sha256= prefixed hex signature", () => {
    const result = computeHmacSha256('{"action":"push"}', secret);
    expect(result).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("should produce consistent results for same input", () => {
    const a = computeHmacSha256("hello", secret);
    const b = computeHmacSha256("hello", secret);
    expect(a).toBe(b);
  });

  it("should produce different results for different payloads", () => {
    const a = computeHmacSha256("payload-a", secret);
    const b = computeHmacSha256("payload-b", secret);
    expect(a).not.toBe(b);
  });

  it("should produce different results for different secrets", () => {
    const a = computeHmacSha256("same", "secret-1");
    const b = computeHmacSha256("same", "secret-2");
    expect(a).not.toBe(b);
  });
});

describe("timingSafeEqual", () => {
  it("should return true for identical strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
  });

  it("should return false for different strings of same length", () => {
    expect(timingSafeEqual("abc123", "abc124")).toBe(false);
  });

  it("should return false for different lengths", () => {
    expect(timingSafeEqual("short", "longer-string")).toBe(false);
  });

  it("should return true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("secureRandomString", () => {
  it("should return a hex string of default length (64 chars = 32 bytes)", () => {
    const result = secureRandomString();
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should return correct length for custom byte count", () => {
    const result = secureRandomString(16);
    expect(result).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it("should produce unique values across calls", () => {
    const a = secureRandomString();
    const b = secureRandomString();
    expect(a).not.toBe(b);
  });
});
