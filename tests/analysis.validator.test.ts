/**
 * Analysis validator (Zod schemas) tests.
 */

import {
  submitAnalysisSchema,
  submitDiffAnalysisSchema,
  getAnalysisSchema,
  listAnalysesSchema,
} from "../src/modules/analysis/analysis.validator";

// ─── submitAnalysisSchema ────────────────────────────────────────────────────

describe("submitAnalysisSchema", () => {
  it("should accept valid minimal input", () => {
    const result = submitAnalysisSchema.parse({
      body: { sourceCode: "const x = 1;" },
    });
    expect(result.body.sourceCode).toBe("const x = 1;");
  });

  it("should accept all optional fields", () => {
    const result = submitAnalysisSchema.parse({
      body: {
        sourceCode: "const x = 1;",
        language: "typescript",
        fileName: "index.ts",
        repositoryId: "550e8400-e29b-41d4-a716-446655440000",
        commitSha: "abc1234",
      },
    });
    expect(result.body.language).toBe("typescript");
  });

  it("should reject empty source code", () => {
    expect(() =>
      submitAnalysisSchema.parse({ body: { sourceCode: "" } })
    ).toThrow();
  });

  it("should reject invalid repositoryId format", () => {
    expect(() =>
      submitAnalysisSchema.parse({
        body: { sourceCode: "x", repositoryId: "not-a-uuid" },
      })
    ).toThrow();
  });
});

// ─── submitDiffAnalysisSchema ────────────────────────────────────────────────

describe("submitDiffAnalysisSchema", () => {
  it("should accept valid diff input", () => {
    const result = submitDiffAnalysisSchema.parse({
      body: { diffContent: "--- a/file.ts\n+++ b/file.ts\n@@ ..." },
    });
    expect(result.body.diffContent).toBeTruthy();
  });

  it("should reject empty diff content", () => {
    expect(() =>
      submitDiffAnalysisSchema.parse({ body: { diffContent: "" } })
    ).toThrow();
  });
});

// ─── getAnalysisSchema ───────────────────────────────────────────────────────

describe("getAnalysisSchema", () => {
  it("should accept valid UUID param", () => {
    const result = getAnalysisSchema.parse({
      params: { id: "550e8400-e29b-41d4-a716-446655440000" },
    });
    expect(result.params.id).toBeTruthy();
  });

  it("should reject non-UUID param", () => {
    expect(() =>
      getAnalysisSchema.parse({ params: { id: "123" } })
    ).toThrow();
  });
});

// ─── listAnalysesSchema ──────────────────────────────────────────────────────

describe("listAnalysesSchema", () => {
  it("should apply defaults for empty query", () => {
    const result = listAnalysesSchema.parse({ query: {} });
    expect(result.query.page).toBe(1);
    expect(result.query.limit).toBe(20);
    expect(result.query.sortBy).toBe("createdAt");
    expect(result.query.sortOrder).toBe("desc");
  });

  it("should coerce string numbers from query params", () => {
    const result = listAnalysesSchema.parse({
      query: { page: "3", limit: "50" },
    });
    expect(result.query.page).toBe(3);
    expect(result.query.limit).toBe(50);
  });

  it("should accept valid status filter", () => {
    const result = listAnalysesSchema.parse({
      query: { status: "COMPLETED" },
    });
    expect(result.query.status).toBe("COMPLETED");
  });

  it("should reject invalid status", () => {
    expect(() =>
      listAnalysesSchema.parse({ query: { status: "UNKNOWN" } })
    ).toThrow();
  });

  it("should reject limit > 100", () => {
    expect(() =>
      listAnalysesSchema.parse({ query: { limit: "200" } })
    ).toThrow();
  });

  it("should reject page < 1", () => {
    expect(() =>
      listAnalysesSchema.parse({ query: { page: "0" } })
    ).toThrow();
  });
});
