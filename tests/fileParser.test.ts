/**
 * File parser utility tests.
 */

import path from "path";
import { parseFile } from "../src/utils/fileParser";

describe("parseFile", () => {
  it("should read a real file from the project", () => {
    // Use this test file itself as the target
    const filePath = path.resolve(__dirname, "../package.json");
    const result = parseFile(filePath);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.content).toContain("ai-code-review");
      expect(result.extension).toBe(".json");
      expect(result.lineCount).toBeGreaterThan(0);
      expect(result.sizeBytes).toBeGreaterThan(0);
    }
  });

  it("should return null for nonexistent file", () => {
    const result = parseFile("/tmp/__nonexistent_file_12345__.ts");
    expect(result).toBeNull();
  });
});
