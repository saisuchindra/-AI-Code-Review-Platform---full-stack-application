import { parseDiff, extractChangedCode, diffStats } from "../src/modules/diff/diff.engine";

const SAMPLE_DIFF = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,6 +10,8 @@ import express from "express";
 
 const app = express();
 
+app.use(helmet());
+app.use(cors());
 app.use(express.json());
 
 export default app;
diff --git a/src/utils/newFile.ts b/src/utils/newFile.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/utils/newFile.ts
@@ -0,0 +1,5 @@
+export function helper() {
+  return true;
+}
+
+export const VERSION = "1.0";
`;

describe("DiffEngine", () => {
  describe("parseDiff", () => {
    it("should parse files from unified diff", () => {
      const result = parseDiff(SAMPLE_DIFF);

      expect(result.totalFiles).toBe(2);
      expect(result.files[0].filePath).toBe("src/app.ts");
      expect(result.files[0].status).toBe("modified");
      expect(result.files[1].filePath).toBe("src/utils/newFile.ts");
      expect(result.files[1].status).toBe("added");
    });

    it("should count additions and deletions", () => {
      const result = parseDiff(SAMPLE_DIFF);

      expect(result.totalAdditions).toBeGreaterThan(0);
      expect(result.files[0].additions).toBe(2);
      expect(result.files[1].additions).toBe(5);
    });

    it("should return empty for empty diff", () => {
      const result = parseDiff("");
      expect(result.totalFiles).toBe(0);
      expect(result.files).toEqual([]);
    });
  });

  describe("extractChangedCode", () => {
    it("should extract only added lines", () => {
      const diffResult = parseDiff(SAMPLE_DIFF);
      const code = extractChangedCode(diffResult);

      expect(code).toContain("app.use(helmet());");
      expect(code).toContain("export function helper()");
    });
  });

  describe("diffStats", () => {
    it("should compute file status breakdown", () => {
      const diffResult = parseDiff(SAMPLE_DIFF);
      const stats = diffStats(diffResult);

      expect(stats.totalFiles).toBe(2);
      expect(stats.filesByStatus["modified"]).toBe(1);
      expect(stats.filesByStatus["added"]).toBe(1);
    });
  });
});
