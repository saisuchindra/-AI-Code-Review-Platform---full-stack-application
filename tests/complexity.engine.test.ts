import { analyzeComplexity } from "../src/modules/analysis/complexity.engine";

describe("ComplexityEngine", () => {
  it("should return base complexity for simple code", () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;

    const result = analyzeComplexity(code, "javascript");

    expect(result.cyclomaticComplexity).toBeGreaterThanOrEqual(1);
    expect(result.linesOfCode).toBeGreaterThan(0);
    expect(result.linesOfLogic).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should detect higher complexity for branching code", () => {
    const simpleCode = `function greet() { return "hello"; }`;
    const complexCode = `
      function process(data) {
        if (data.type === "a") {
          for (let i = 0; i < data.items.length; i++) {
            if (data.items[i].active && data.items[i].valid) {
              switch (data.items[i].category) {
                case 1: handle1(); break;
                case 2: handle2(); break;
                case 3: handle3(); break;
              }
            }
          }
        } else if (data.type === "b") {
          while (data.hasNext()) {
            try {
              data.process();
            } catch (e) {
              if (e.retry) { continue; }
              throw e;
            }
          }
        }
      }
    `;

    const simpleResult = analyzeComplexity(simpleCode, "javascript");
    const complexResult = analyzeComplexity(complexCode, "javascript");

    expect(complexResult.cyclomaticComplexity).toBeGreaterThan(simpleResult.cyclomaticComplexity);
    expect(complexResult.maxNestingDepth).toBeGreaterThan(simpleResult.maxNestingDepth);
    expect(complexResult.cognitiveComplexity).toBeGreaterThan(simpleResult.cognitiveComplexity);
    expect(complexResult.score).toBeLessThan(simpleResult.score);
  });

  it("should compute maintainability index", () => {
    const code = `
      function example() {
        const x = 1;
        const y = 2;
        return x + y;
      }
    `;

    const result = analyzeComplexity(code, "javascript");
    expect(result.maintainabilityIndex).toBeGreaterThan(0);
    expect(result.maintainabilityIndex).toBeLessThanOrEqual(171);
  });

  it("should count functions correctly", () => {
    const code = `
      function a() {}
      function b() {}
      const c = () => {};
    `;

    const result = analyzeComplexity(code, "javascript");
    expect(result.functionCount).toBeGreaterThanOrEqual(2);
  });
});
