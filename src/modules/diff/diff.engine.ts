import { DiffResult, DiffFile, DiffHunk } from "../../types/analysis.types";

/**
 * Parses unified diff format into structured data.
 */
export function parseDiff(rawDiff: string): DiffResult {
  const files: DiffFile[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  // Split into per-file diffs
  const fileChunks = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const file = parseFileChunk(chunk);
    if (file) {
      files.push(file);
      totalAdditions += file.additions;
      totalDeletions += file.deletions;
    }
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  };
}

function parseFileChunk(chunk: string): DiffFile | null {
  const lines = chunk.split("\n");

  // Extract file path from the first line: a/path b/path
  const headerMatch = lines[0]?.match(/a\/(.+?)\s+b\/(.+)/);
  if (!headerMatch) return null;

  const filePath = headerMatch[2];

  // Determine status
  let status: DiffFile["status"] = "modified";
  if (chunk.includes("new file mode")) {
    status = "added";
  } else if (chunk.includes("deleted file mode")) {
    status = "deleted";
  } else if (chunk.includes("rename from") || chunk.includes("rename to")) {
    status = "renamed";
  }

  // Parse hunks
  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;
  let currentHunkLines: string[] = [];
  let currentHunkHeader: { oldStart: number; oldLines: number; newStart: number; newLines: number } | null = null;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    if (hunkMatch) {
      // Save previous hunk
      if (currentHunkHeader) {
        hunks.push({
          ...currentHunkHeader,
          content: currentHunkLines.join("\n"),
        });
      }

      currentHunkHeader = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] ?? "1", 10),
      };
      currentHunkLines = [line];
    } else if (currentHunkHeader) {
      currentHunkLines.push(line);

      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }
  }

  // Save last hunk
  if (currentHunkHeader) {
    hunks.push({
      ...currentHunkHeader,
      content: currentHunkLines.join("\n"),
    });
  }

  return {
    filePath,
    status,
    hunks,
    additions,
    deletions,
  };
}

/**
 * Extracts only the new/changed lines from a diff for analysis.
 */
export function extractChangedCode(diffResult: DiffResult): string {
  const changedLines: string[] = [];

  for (const file of diffResult.files) {
    if (file.status === "deleted") continue;

    changedLines.push(`// --- ${file.filePath} ---`);

    for (const hunk of file.hunks) {
      const hunkLines = hunk.content.split("\n");
      for (const line of hunkLines) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          changedLines.push(line.substring(1)); // Remove the '+' prefix
        }
      }
    }
    changedLines.push("");
  }

  return changedLines.join("\n");
}

/**
 * Computes summary statistics from a diff.
 */
export function diffStats(diffResult: DiffResult): {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  filesByStatus: Record<string, number>;
} {
  const filesByStatus: Record<string, number> = {};

  for (const file of diffResult.files) {
    filesByStatus[file.status] = (filesByStatus[file.status] ?? 0) + 1;
  }

  return {
    totalFiles: diffResult.totalFiles,
    totalAdditions: diffResult.totalAdditions,
    totalDeletions: diffResult.totalDeletions,
    filesByStatus,
  };
}
