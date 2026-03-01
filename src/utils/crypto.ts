import crypto from "crypto";

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 */
export function computeHmacSha256(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload, "utf-8").digest("hex")}`;
}

/**
 * Timing-safe comparison of two strings (prevents timing attacks).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a cryptographically secure random string.
 */
export function secureRandomString(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}
