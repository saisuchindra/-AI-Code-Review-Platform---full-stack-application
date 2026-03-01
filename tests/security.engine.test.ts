import { analyzeSecurityPatterns } from "../src/modules/analysis/security.engine";

describe("SecurityEngine", () => {
  it("should detect eval usage", () => {
    const code = `const result = eval(userInput);`;
    const result = analyzeSecurityPatterns(code, "javascript");

    expect(result.findings.length).toBeGreaterThan(0);
    const evalFinding = result.findings.find((f) => f.rule === "SEC001");
    expect(evalFinding).toBeDefined();
    expect(evalFinding!.severity).toBe("CRITICAL");
  });

  it("should detect hardcoded credentials", () => {
    const code = `const password = "mysecretpassword123";\nconst api_key = "sk-abc123xyz";`;
    const result = analyzeSecurityPatterns(code, "javascript");

    const credFinding = result.findings.find((f) => f.rule === "SEC010");
    expect(credFinding).toBeDefined();
    expect(credFinding!.severity).toBe("CRITICAL");
  });

  it("should detect innerHTML XSS risk", () => {
    const code = `element.innerHTML = userInput;`;
    const result = analyzeSecurityPatterns(code, "javascript");

    const xssFinding = result.findings.find((f) => f.rule === "SEC003");
    expect(xssFinding).toBeDefined();
    expect(xssFinding!.severity).toBe("HIGH");
  });

  it("should flag Math.random for JS/TS only", () => {
    const code = `const id = Math.random();`;

    const jsResult = analyzeSecurityPatterns(code, "javascript");
    const pyResult = analyzeSecurityPatterns(code, "python");

    const jsFind = jsResult.findings.find((f) => f.rule === "SEC032");
    const pyFind = pyResult.findings.find((f) => f.rule === "SEC032");

    expect(jsFind).toBeDefined();
    expect(pyFind).toBeUndefined();
  });

  it("should return score 100 for clean code", () => {
    const code = `
      function add(a: number, b: number): number {
        return a + b;
      }
    `;
    const result = analyzeSecurityPatterns(code, "typescript");
    expect(result.score).toBe(100);
  });

  it("should reduce score based on severity", () => {
    const code = `eval("alert(1)");\nconst password = "secret123abc!";`;
    const result = analyzeSecurityPatterns(code, "javascript");
    expect(result.score).toBeLessThan(100);
  });
});
