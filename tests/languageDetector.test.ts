import { detectLanguage, getLanguageFromExtension } from "../src/utils/languageDetector";

describe("LanguageDetector", () => {
  describe("detectLanguage", () => {
    it("should detect TypeScript from .ts extension", () => {
      const result = detectLanguage("app.ts");
      expect(result.language).toBe("typescript");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should detect Python from .py extension", () => {
      const result = detectLanguage("main.py");
      expect(result.language).toBe("python");
    });

    it("should detect JavaScript from .js extension", () => {
      const result = detectLanguage("index.js");
      expect(result.language).toBe("javascript");
    });

    it("should detect Go from .go extension", () => {
      const result = detectLanguage("main.go");
      expect(result.language).toBe("go");
    });

    it("should detect Java from .java extension", () => {
      const result = detectLanguage("App.java");
      expect(result.language).toBe("java");
    });

    it("should detect PHP from content", () => {
      const result = detectLanguage("file", "<?php echo 'hello'; ?>");
      expect(result.language).toBe("php");
    });

    it("should detect language from shebang", () => {
      const result = detectLanguage("script", "#!/usr/bin/env python3\nprint('hello')");
      expect(result.language).toBe("python");
    });

    it("should return unknown for unrecognized files", () => {
      const result = detectLanguage("readme");
      expect(result.language).toBe("unknown");
      expect(result.confidence).toBe(0);
    });
  });

  describe("getLanguageFromExtension", () => {
    it("should return correct language for known extensions", () => {
      expect(getLanguageFromExtension(".ts")).toBe("typescript");
      expect(getLanguageFromExtension("py")).toBe("python");
      expect(getLanguageFromExtension(".rs")).toBe("rust");
    });

    it("should return unknown for unknown extensions", () => {
      expect(getLanguageFromExtension(".xyz")).toBe("unknown");
    });
  });
});
