import { prisma } from "../../config/database";
import { Repository, Prisma } from "@prisma/client";

export async function createRepository(data: {
  userId: string;
  name: string;
  url: string;
  branch?: string;
  language?: string;
  localPath?: string;
}): Promise<Repository> {
  return prisma.repository.create({
    data: {
      userId: data.userId,
      name: data.name,
      url: data.url,
      branch: data.branch ?? "main",
      language: data.language,
      localPath: data.localPath,
    },
  });
}

export async function findRepositoryById(
  id: string,
  userId: string
): Promise<Repository | null> {
  return prisma.repository.findFirst({
    where: { id, userId },
  });
}

export async function listRepositories(
  userId: string,
  options: { page: number; limit: number }
): Promise<{ repositories: Repository[]; total: number }> {
  const where: Prisma.RepositoryWhereInput = { userId };

  const [repositories, total] = await prisma.$transaction([
    prisma.repository.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      include: {
        _count: { select: { analyses: true } },
      },
    }),
    prisma.repository.count({ where }),
  ]);

  return { repositories, total };
}

export async function updateRepository(
  id: string,
  userId: string,
  data: Partial<{ name: string; branch: string; language: string; localPath: string }>
): Promise<Repository | null> {
  const repo = await prisma.repository.findFirst({ where: { id, userId } });
  if (!repo) return null;

  return prisma.repository.update({
    where: { id },
    data,
  });
}

export async function deleteRepository(id: string, userId: string): Promise<boolean> {
  const repo = await prisma.repository.findFirst({ where: { id, userId } });
  if (!repo) return false;

  await prisma.repository.delete({ where: { id } });
  return true;
}
