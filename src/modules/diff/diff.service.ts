import simpleGit from "simple-git";
import path from "path";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ServiceResult } from "../../types/global.types";
import { DiffResult } from "../../types/analysis.types";
import { parseDiff, extractChangedCode, diffStats } from "./diff.engine";
import * as repoRepository from "../repository/repo.repository";

// ─── Parse Raw Diff ──────────────────────────────────────────────────────────

export async function parseRawDiff(
  rawDiff: string
): Promise<ServiceResult<DiffResult & { stats: ReturnType<typeof diffStats> }>> {
  try {
    const result = parseDiff(rawDiff);
    const stats = diffStats(result);

    return { ok: true, data: { ...result, stats } };
  } catch (error) {
    logger.error({ error }, "Failed to parse diff");
    return {
      ok: false,
      error: {
        code: "DIFF_PARSE_ERROR",
        message: "Failed to parse diff content",
        statusCode: 400,
      },
    };
  }
}

// ─── Get Diff Between Commits ────────────────────────────────────────────────

export async function getDiffBetweenCommits(
  repoId: string,
  userId: string,
  fromSha: string,
  toSha: string
): Promise<ServiceResult<DiffResult & { changedCode: string }>> {
  const repo = await repoRepository.findRepositoryById(repoId, userId);
  if (!repo) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }

  const localPath = repo.localPath ?? path.resolve(env.GIT_CLONE_BASE_PATH, userId, repoId);

  try {
    const git = simpleGit(localPath);
    const rawDiff = await git.diff([`${fromSha}..${toSha}`]);

    const diffResult = parseDiff(rawDiff);
    const changedCode = extractChangedCode(diffResult);

    return { ok: true, data: { ...diffResult, changedCode } };
  } catch (error) {
    logger.error({ repoId, fromSha, toSha, error }, "Failed to get diff between commits");
    return {
      ok: false,
      error: {
        code: "DIFF_FAILED",
        message: `Failed to compute diff: ${error instanceof Error ? error.message : "Unknown error"}`,
        statusCode: 500,
      },
    };
  }
}

// ─── Get Working Tree Diff ───────────────────────────────────────────────────

export async function getWorkingDiff(
  repoId: string,
  userId: string
): Promise<ServiceResult<DiffResult>> {
  const repo = await repoRepository.findRepositoryById(repoId, userId);
  if (!repo) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }

  const localPath = repo.localPath ?? path.resolve(env.GIT_CLONE_BASE_PATH, userId, repoId);

  try {
    const git = simpleGit(localPath);
    const rawDiff = await git.diff();
    const diffResult = parseDiff(rawDiff);

    return { ok: true, data: diffResult };
  } catch (error) {
    logger.error({ repoId, error }, "Failed to get working diff");
    return {
      ok: false,
      error: {
        code: "DIFF_FAILED",
        message: "Failed to compute working tree diff",
        statusCode: 500,
      },
    };
  }
}
