import { getGeminiModel, getAIClient, aiConfig } from "../../config/ai";
import { AIAnalysisResult } from "../../types/analysis.types";
import { ComplexityResult } from "../../types/analysis.types";
import { logger } from "../../utils/logger";

const SYSTEM_PROMPT = `ROLE:
You are an internal AI static analysis engine integrated inside a production backend service.

You are not conversational.
You do not explain your process.
You do not provide extra commentary.
You output strictly valid JSON.

CONTEXT:
You are part of a multi-layer analysis pipeline:
- Static rule engine already executed.
- Basic complexity heuristics already computed.
- Language detection already performed.

Your responsibility is deep semantic review, architectural reasoning, advanced bug detection, and improvement suggestions.

You must not repeat basic lint-style feedback unless it has architectural impact.

You must perform:
1. Deep Logical Error Detection
2. Hidden Edge Case Identification
3. Architectural Weakness Detection
4. Advanced Security Pattern Detection
5. Concurrency & Resource Risk Analysis
6. API Contract Violations (if backend code)
7. Scalability Risk Detection
8. Data Flow & Mutation Risk Review
9. Production Hardening Gaps
10. Senior-Level Refactoring Guidance

STRICT RULES:
- If uncertain about a line number, return null.
- Do not fabricate vulnerabilities.
- If confidence is below 0.6, reflect it in confidence_score.
- Never output text outside JSON.
- Never include markdown.
- Never summarize outside the executive_summary field.
- Be precise and technical.
- No motivational language.
- No generic advice like "improve readability".

SEVERITY LEVELS: INFO, LOW, MEDIUM, HIGH, CRITICAL

OUTPUT FORMAT (STRICT):
{
  "analysis_metadata": {
    "engine_version": "1.0",
    "analysis_type": "deep_semantic_review",
    "confidence_score": 0.0
  },
  "logical_errors": [
    {
      "line_number": null,
      "severity": "",
      "issue": "",
      "technical_explanation": "",
      "recommended_fix": ""
    }
  ],
  "edge_case_risks": [],
  "architectural_weaknesses": [],
  "security_risks": [],
  "performance_risks": [],
  "concurrency_risks": [],
  "data_flow_risks": [],
  "production_hardening_gaps": [],
  "refactoring_recommendations": [],
  "executive_summary": ""
}

If no issues exist in a category, return an empty array.
Never omit fields.
Never return additional keys.`;

export async function analyzeWithAI(
  sourceCode: string,
  language: string,
  complexityHints?: ComplexityResult
): Promise<AIAnalysisResult> {
  if (aiConfig.provider === "gemini") {
    return analyzeWithGemini(sourceCode, language, complexityHints);
  }
  return analyzeWithOpenAI(sourceCode, language, complexityHints);
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 5_000; // 5 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function analyzeWithGemini(
  sourceCode: string,
  language: string,
  complexityHints?: ComplexityResult
): Promise<AIAnalysisResult> {
  const model = getGeminiModel();
  const userMessage = buildUserMessage(sourceCode, language, complexityHints);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ attempt, maxRetries: MAX_RETRIES }, "Gemini analysis attempt");

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const content = response.text();

      if (!content) {
        throw new Error("Empty response from Gemini");
      }

      // Gemini may wrap JSON in markdown fences — strip them
      const cleaned = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned) as AIAnalysisResult;
      validateAIResponse(parsed);

      logger.info(
        {
          model: aiConfig.geminiModel,
          confidence: parsed.analysis_metadata.confidence_score,
          attempt,
        },
        "Gemini analysis completed"
      );

      return parsed;
    } catch (error: any) {
      lastError = error;
      const status = error?.status ?? error?.response?.status ?? error?.code;
      const isRateLimited = status === 429 || String(error?.message).includes("429") || String(error?.message).toLowerCase().includes("quota");

      if (isRateLimited && attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1); // 5s, 10s, 20s
        logger.warn(
          { attempt, backoffMs: backoff, status },
          `Gemini rate limited — retrying in ${backoff / 1000}s`
        );
        await sleep(backoff);
        continue;
      }

      logger.error({ error, attempt }, "Gemini analysis failed");
      break;
    }
  }

  throw lastError;
}

// ─── OpenAI Provider (fallback) ──────────────────────────────────────────────

async function analyzeWithOpenAI(
  sourceCode: string,
  language: string,
  complexityHints?: ComplexityResult
): Promise<AIAnalysisResult> {
  const client = getAIClient();

  const userMessage = buildUserMessage(sourceCode, language, complexityHints);

  try {
    const response = await client.chat.completions.create({
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI provider");
    }

    const parsed = JSON.parse(content) as AIAnalysisResult;
    validateAIResponse(parsed);

    logger.info(
      {
        model: aiConfig.model,
        tokensUsed: response.usage?.total_tokens,
        confidence: parsed.analysis_metadata.confidence_score,
      },
      "OpenAI analysis completed"
    );

    return parsed;
  } catch (error) {
    logger.error({ error }, "OpenAI analysis failed");
    throw error;
  }
}

function buildUserMessage(sourceCode: string, language: string, complexity?: ComplexityResult): string {
  let message = `LANGUAGE: ${language}\n\n`;

  if (complexity) {
    message += `PRECOMPUTED COMPLEXITY HINTS:\n`;
    message += `- Cyclomatic Complexity: ${complexity.cyclomaticComplexity}\n`;
    message += `- Cognitive Complexity: ${complexity.cognitiveComplexity}\n`;
    message += `- Max Nesting Depth: ${complexity.maxNestingDepth}\n`;
    message += `- Function Count: ${complexity.functionCount}\n`;
    message += `- Lines of Logic: ${complexity.linesOfLogic}\n`;
    message += `- Maintainability Index: ${complexity.maintainabilityIndex}\n\n`;
  }

  message += `SOURCE CODE:\n\`\`\`${language}\n${sourceCode}\n\`\`\``;

  return message;
}

function validateAIResponse(result: AIAnalysisResult): void {
  const requiredFields: (keyof AIAnalysisResult)[] = [
    "analysis_metadata",
    "logical_errors",
    "edge_case_risks",
    "architectural_weaknesses",
    "security_risks",
    "performance_risks",
    "concurrency_risks",
    "data_flow_risks",
    "production_hardening_gaps",
    "refactoring_recommendations",
    "executive_summary",
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`AI response missing required field: ${field}`);
    }
  }

  if (typeof result.analysis_metadata?.confidence_score !== "number") {
    throw new Error("AI response: confidence_score must be a number");
  }
}
