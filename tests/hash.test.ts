/**
 * Hash utility tests — bcrypt password hashing and verification.
 */

import { hashPassword, verifyPassword } from "../src/utils/hash";

describe("hashPassword", () => {
  it("should return a bcrypt hash starting with $2a$ or $2b$", async () => {
    const hash = await hashPassword("SecretP@ss1");
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
  });

  it("should produce different hashes for the same input (salted)", async () => {
    const [a, b] = await Promise.all([
      hashPassword("Test@1234"),
      hashPassword("Test@1234"),
    ]);
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("should return true for matching password + hash", async () => {
    const hash = await hashPassword("Correct@1");
    const result = await verifyPassword("Correct@1", hash);
    expect(result).toBe(true);
  });

  it("should return false for wrong password", async () => {
    const hash = await hashPassword("Correct@1");
    const result = await verifyPassword("Wrong@111", hash);
    expect(result).toBe(false);
  });
});
