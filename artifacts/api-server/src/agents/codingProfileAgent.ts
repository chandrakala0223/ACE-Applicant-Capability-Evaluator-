import { callLLMJson } from "../lib/llm";
import { logger } from "../lib/logger";

export interface CodingProfileOutput {
  platforms_analyzed: string[];
  overall_coding_score: number;
  problem_solving_level: string;
  contest_performance: string;
  confidence: number;
  explanation: string;
}

export async function runCodingProfileAgent(
  leetcodeUrl: string,
  codeforcesUrl: string,
  hackerrankUrl: string,
): Promise<CodingProfileOutput | null> {
  const platforms = [leetcodeUrl, codeforcesUrl, hackerrankUrl].filter(Boolean);
  if (platforms.length === 0) return null;

  const systemPrompt = `You are analyzing competitive programming profiles for a software engineering role.`;
  const userPrompt = `Based on these coding profile URLs, provide an assessment and return JSON:
{
  "platforms_analyzed": ["list of platforms"],
  "overall_coding_score": 0-100,
  "problem_solving_level": "beginner|intermediate|advanced|expert",
  "contest_performance": "description",
  "confidence": 0-100,
  "explanation": "assessment rationale"
}

LeetCode: ${leetcodeUrl || "Not provided"}
Codeforces: ${codeforcesUrl || "Not provided"}
HackerRank: ${hackerrankUrl || "Not provided"}`;

  try {
    const result = await callLLMJson<CodingProfileOutput>(systemPrompt, userPrompt);
    return {
      score: result.overall_coding_score || 0,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: [result.problem_solving_level].filter(Boolean),
      weaknesses: [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err }, "Coding profile analysis failed");
    return {
      score: 0,
      confidence: 0,
      summary: "Coding profile analysis failed",
      strengths: [],
      weaknesses: [],
      metadata: {},
    } as any;
  }
}
