import simpleGit, { SimpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ServiceResult } from "../../types/global.types";
import * as repoRepository from "./repo.repository";

interface RepoInput {
  name: string;
  url: string;
  branch?: string;
  language?: string;
}

// ─── Add Repository ──────────────────────────────────────────────────────────

export async function addRepository(
  userId: string,
  input: RepoInput
): Promise<ServiceResult<any>> {
  try {
    const repo = await repoRepository.createRepository({
      userId,
      name: input.name,
      url: input.url,
      branch: input.branch,
      language: input.language,
    });

    return { ok: true, data: repo };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_REPO",
          message: "Repository with this URL already exists for your account",
          statusCode: 409,
        },
      };
    }
    throw error;
  }
}

// ─── Clone Repository ────────────────────────────────────────────────────────

export async function cloneRepository(
  repoId: string,
  userId: string
): Promise<ServiceResult<{ localPath: string }>> {
  const repo = await repoRepository.findRepositoryById(repoId, userId);
  if (!repo) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }

  const clonePath = path.resolve(env.GIT_CLONE_BASE_PATH, userId, repo.id);

  try {
    // Clean previous clone if exists
    if (fs.existsSync(clonePath)) {
      fs.rmSync(clonePath, { recursive: true, force: true });
    }

    fs.mkdirSync(clonePath, { recursive: true });

    const git: SimpleGit = simpleGit();
    await git.clone(repo.url, clonePath, [
      "--branch", repo.branch,
      "--depth", "1",
      "--single-branch",
    ]);

    // Update local path
    await repoRepository.updateRepository(repoId, userId, { localPath: clonePath });

    logger.info({ repoId, clonePath }, "Repository cloned");

    return { ok: true, data: { localPath: clonePath } };
  } catch (error) {
    logger.error({ repoId, error }, "Failed to clone repository");
    return {
      ok: false,
      error: {
        code: "CLONE_FAILED",
        message: `Failed to clone repository: ${error instanceof Error ? error.message : "Unknown error"}`,
        statusCode: 500,
      },
    };
  }
}

// ─── Get ─────────────────────────────────────────────────────────────────────

export async function getRepository(
  repoId: string,
  userId: string
): Promise<ServiceResult<any>> {
  const repo = await repoRepository.findRepositoryById(repoId, userId);
  if (!repo) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }
  return { ok: true, data: repo };
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listRepositories(
  userId: string,
  page: number,
  limit: number
): Promise<ServiceResult<any>> {
  const { repositories, total } = await repoRepository.listRepositories(userId, { page, limit });

  return {
    ok: true,
    data: {
      repositories,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateRepository(
  repoId: string,
  userId: string,
  data: Partial<{ name: string; branch: string; language: string }>
): Promise<ServiceResult<any>> {
  const updated = await repoRepository.updateRepository(repoId, userId, data);
  if (!updated) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }
  return { ok: true, data: updated };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteRepository(
  repoId: string,
  userId: string
): Promise<ServiceResult<{ message: string }>> {
  const deleted = await repoRepository.deleteRepository(repoId, userId);
  if (!deleted) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Repository not found", statusCode: 404 },
    };
  }

  // Clean cloned files
  const clonePath = path.resolve(env.GIT_CLONE_BASE_PATH, userId, repoId);
  if (fs.existsSync(clonePath)) {
    fs.rmSync(clonePath, { recursive: true, force: true });
  }

  return { ok: true, data: { message: "Repository deleted" } };
}
