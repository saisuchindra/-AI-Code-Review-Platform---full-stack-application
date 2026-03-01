import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";
import { env } from "./env";
import { logger } from "../utils/logger";

// ─── Gemini Client ──────────────────────────────────────────────────────────

let geminiModel: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (!geminiModel) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    logger.info(`Gemini client initialized: model=${env.GEMINI_MODEL}`);
  }
  return geminiModel;
}

// ─── OpenAI Client (fallback) ───────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 120_000,
      maxRetries: 2,
    });
    logger.info(`OpenAI client initialized: model=${env.OPENAI_MODEL}`);
  }
  return openaiClient;
}

export const aiConfig = {
  provider: env.AI_PROVIDER,
  geminiModel: env.GEMINI_MODEL,
  model: env.OPENAI_MODEL,
  maxTokens: env.OPENAI_MAX_TOKENS,
  temperature: env.OPENAI_TEMPERATURE,
} as const;
