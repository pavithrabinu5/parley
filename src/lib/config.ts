import { modeSchema } from "./domain";
import { z } from "zod";
export function config() {
  const mode = modeSchema.parse(process.env.APP_MODE ?? "demo");
  const aiProvider = z
    .enum(["ollama", "gemini", "openai"])
    .parse(process.env.AI_PROVIDER ?? "ollama");
  return {
    mode,
    origin: process.env.APP_ORIGIN ?? "http://localhost:3000",
    token: process.env.MERCHANT_ACCESS_TOKEN ?? "",
    aiProvider,
    aiModel:
      aiProvider === "ollama"
        ? "qwen3:4b"
        : aiProvider === "gemini"
          ? (process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite")
          : (process.env.OPENAI_MODEL ?? "gpt-4.1-mini"),
  };
}
