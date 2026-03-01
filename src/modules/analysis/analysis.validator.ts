import { z } from "zod";

export const submitAnalysisSchema = z.object({
  body: z.object({
    sourceCode: z.string().min(1, "Source code is required").max(500_000, "Source code too large (500KB max)"),
    language: z.string().min(1).max(50).optional(),
    fileName: z.string().max(500).optional(),
    repositoryId: z.string().uuid().optional(),
    commitSha: z.string().max(40).optional(),
  }),
});

export const submitDiffAnalysisSchema = z.object({
  body: z.object({
    diffContent: z.string().min(1, "Diff content is required").max(1_000_000),
    repositoryId: z.string().uuid().optional(),
    commitSha: z.string().max(40).optional(),
    language: z.string().min(1).max(50).optional(),
  }),
});

export const getAnalysisSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid analysis ID"),
  }),
});

export const listAnalysesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).optional(),
    repositoryId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "overallScore", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export type SubmitAnalysisInput = z.infer<typeof submitAnalysisSchema>["body"];
export type SubmitDiffAnalysisInput = z.infer<typeof submitDiffAnalysisSchema>["body"];
export type ListAnalysesQuery = z.infer<typeof listAnalysesSchema>["query"];
