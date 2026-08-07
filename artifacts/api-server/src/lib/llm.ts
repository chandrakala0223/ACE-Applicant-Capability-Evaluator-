import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "./logger";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

function getGroqClient(): ChatGroq {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  return new ChatGroq({ apiKey, model: GROQ_MODEL, temperature: 0.1, maxRetries: 0 });
}

function getOpenRouterClient(): ChatOpenAI {
  const apiKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  return new ChatOpenAI({
    apiKey,
    model: OPENROUTER_MODEL,
    temperature: 0.1,
    maxRetries: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://talentos.ai",
        "X-Title": "TalentOS AI",
      },
    },
  });
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  expectJson = true,
): Promise<string> {
  const messages = [
    new SystemMessage(expectJson
      ? `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just JSON.`
      : systemPrompt),
    new HumanMessage(userPrompt),
  ];

  // Try Groq first
  try {
    const client = getGroqClient();
    const response = await client.invoke(messages);
    return String(response.content).trim();
  } catch (err) {
    logger.warn({ err }, "Groq call failed, falling back to OpenRouter");
  }

  // Fallback to OpenRouter
  try {
    const client = getOpenRouterClient();
    const response = await client.invoke(messages);
    return String(response.content).trim();
  } catch (err) {
    logger.error({ err }, "OpenRouter fallback also failed");
    throw new Error("LLM_TIMEOUT: Both Groq and OpenRouter failed");
  }
}

export async function callLLMJson<T = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const raw = await callLLM(systemPrompt, userPrompt, true);

  // Strip markdown code blocks if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting JSON from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`MALFORMED_JSON: LLM returned non-JSON response: ${cleaned.slice(0, 200)}`);
  }
}

// Real sentence embeddings via HuggingFace Inference API
// Model: sentence-transformers/all-MiniLM-L6-v2 (384-dim, matches Qdrant collections)
// Set HUGGINGFACE_API_KEY for higher rate limits; works without one on free tier.
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env["HUGGINGFACE_API_KEY"]?.trim();
  const model = "sentence-transformers/all-MiniLM-L6-v2";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: text.slice(0, 512),
        options: { wait_for_model: true, use_cache: true },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HuggingFace embedding API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as number[] | number[][];

  // Feature-extraction returns token-level embeddings [seq_len, 384]; mean-pool them.
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const matrix = data as number[][];
    const dim = matrix[0].length;
    const pooled = new Array<number>(dim).fill(0);
    for (const vec of matrix) {
      for (let i = 0; i < dim; i++) pooled[i] += vec[i];
    }
    const result = pooled.map((v) => v / matrix.length);
    const mag = Math.sqrt(result.reduce((s, v) => s + v * v, 0)) || 1;
    return result.map((v) => v / mag);
  }

  // Already a pooled 1-D vector
  const vec = data as number[];
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}
