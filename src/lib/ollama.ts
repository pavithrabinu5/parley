import { z } from "zod";
import { recommendationSchema } from "./domain";
import { AppError } from "./errors";

const completionSchema = z.object({
  model: z.literal("qwen3:4b"),
  done: z.literal(true),
  done_reason: z.literal("stop"),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string().min(1).max(32000),
    tool_calls: z.array(z.unknown()).max(0).optional(),
  }),
});

export async function localRecommendation(
  instruction: string,
  input: string,
): Promise<unknown> {
  const format = z.toJSONSchema(recommendationSchema);
  const system = `${instruction}\nOUTPUT JSON SCHEMA: ${JSON.stringify(format)}`;
  // Conservative byte bound leaves room for the 2,200-token output and chat template
  // in the 16k context. Never silently truncate potentially relevant case evidence.
  if (Buffer.byteLength(system + input, "utf8") > 12000)
    throw new AppError(
      413,
      "This case exceeds the local model's context budget. Review it manually; no cloud fallback was used.",
    );
  let response: Response;
  try {
    response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
        stream: false,
        think: false,
        format,
        options: { temperature: 0, num_ctx: 16384, num_predict: 2200 },
        keep_alive: "5m",
      }),
    });
  } catch {
    throw new AppError(
      503,
      "Local AI is unavailable or timed out. Open Ollama and ensure qwen3:4b is downloaded, then retry. No cloud fallback was used.",
    );
  }
  if (!response.ok)
    throw new AppError(
      502,
      `Ollama returned HTTP ${response.status}. Ensure qwen3:4b is installed. No cloud fallback was used.`,
    );
  try {
    const completion = completionSchema.parse(await response.json());
    return JSON.parse(completion.message.content) as unknown;
  } catch {
    throw new AppError(
      502,
      "Local AI did not produce a complete valid JSON response. Retry analysis or review manually.",
    );
  }
}
