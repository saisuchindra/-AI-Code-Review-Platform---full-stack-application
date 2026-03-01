import { prisma } from "../../config/database";
import { logger } from "../../utils/logger";
import { addAnalysisJob } from "../../jobs/queue";
import { AnalysisJobPayload } from "../../types/global.types";

interface GitHubPushPayload {
  ref: string;
  after: string;
  before: string;
  repository: {
    full_name: string;
    html_url: string;
    default_branch: string;
  };
  head_commit?: {
    id: string;
    message: string;
    author: { name: string; email: string };
    added: string[];
    removed: string[];
    modified: string[];
  };
  pusher: { name: string; email: string };
}

interface GitHubPRPayload {
  action: string;
  number: number;
  pull_request: {
    title: string;
    state: string;
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
    diff_url: string;
    html_url: string;
    user: { login: string };
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

/**
 * Handle push events — trigger analysis for changed files on the default branch.
 */
export async function handlePushEvent(payload: GitHubPushPayload): Promise<void> {
  const repoUrl = payload.repository.html_url;
  const commitSha = payload.after;
  const branch = payload.ref.replace("refs/heads/", "");

  logger.info({ repoUrl, commitSha, branch }, "Processing push event");

  // Find matching repository in our database
  const repo = await prisma.repository.findFirst({
    where: {
      url: { contains: payload.repository.full_name },
      branch,
    },
    include: { user: { select: { id: true } } },
  });

  if (!repo) {
    logger.info({ repoUrl, branch }, "No matching repository found for push event");
    return;
  }

  // Get modified/added files from head commit
  const changedFiles = [
    ...(payload.head_commit?.added || []),
    ...(payload.head_commit?.modified || []),
  ];

  if (changedFiles.length === 0) {
    logger.info({ commitSha }, "No files to analyze in push");
    return;
  }

  // Create analysis record
  const analysis = await prisma.analysis.create({
    data: {
      userId: repo.user.id,
      repositoryId: repo.id,
      commitSha,
      triggerType: "PUSH",
      status: "PENDING",
      fileName: changedFiles.join(", "),
    },
  });

  const jobPayload: AnalysisJobPayload = {
    analysisId: analysis.id,
    userId: repo.user.id,
    repositoryId: repo.id,
    commitSha,
  };

  await addAnalysisJob(jobPayload);
  logger.info({ analysisId: analysis.id, filesCount: changedFiles.length }, "Push analysis queued");
}

/**
 * Handle pull request events — trigger analysis on PR open/synchronize.
 */
export async function handlePullRequestEvent(payload: GitHubPRPayload): Promise<void> {
  if (!["opened", "synchronize", "reopened"].includes(payload.action)) {
    logger.info({ action: payload.action }, "Skipping PR event action");
    return;
  }

  const repoUrl = payload.repository.html_url;
  const headSha = payload.pull_request.head.sha;
  const prNumber = payload.number;

  logger.info({ repoUrl, prNumber, headSha, action: payload.action }, "Processing PR event");

  // Find matching repository
  const repo = await prisma.repository.findFirst({
    where: {
      url: { contains: payload.repository.full_name },
    },
    include: { user: { select: { id: true } } },
  });

  if (!repo) {
    logger.info({ repoUrl }, "No matching repository found for PR event");
    return;
  }

  // Create analysis record
  const analysis = await prisma.analysis.create({
    data: {
      userId: repo.user.id,
      repositoryId: repo.id,
      commitSha: headSha,
      triggerType: "PULL_REQUEST",
      status: "PENDING",
      fileName: `PR #${prNumber}: ${payload.pull_request.title}`,
    },
  });

  const jobPayload: AnalysisJobPayload = {
    analysisId: analysis.id,
    userId: repo.user.id,
    repositoryId: repo.id,
    commitSha: headSha,
  };

  await addAnalysisJob(jobPayload);
  logger.info({ analysisId: analysis.id, prNumber }, "PR analysis queued");
}
