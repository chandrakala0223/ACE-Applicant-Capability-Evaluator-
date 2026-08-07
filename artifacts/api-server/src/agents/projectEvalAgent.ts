import { callLLMJson } from "../lib/llm";
import { logger } from "../lib/logger";
import type { IParsedResume } from "../models/Candidate";
import type { IGitHubReport } from "../models/GitHubReport";

export interface ProjectEvalOutput {
  project_complexity: "low" | "medium" | "high" | "expert";
  relevance_score: number;
  notable_projects: string[];
  technical_depth: string;
  confidence: number;
  explanation: string;
}

export async function runProjectEvalAgent(
  parsedResume: IParsedResume,
  githubReport: IGitHubReport | null,
  jobTitle: string,
): Promise<ProjectEvalOutput> {
  const systemPrompt = `You are a senior software architect evaluating a candidate's project portfolio.
Assess depth, complexity, real-world relevance and technical quality of projects.`;

  const userPrompt = `Evaluate the candidate's projects and return JSON:
{
  "project_complexity": "low|medium|high|expert",
  "relevance_score": 0-100,
  "notable_projects": ["2-3 most impressive projects"],
  "technical_depth": "assessment of technical sophistication",
  "confidence": 0-100,
  "explanation": "detailed evaluation rationale"
}

Target Role: ${jobTitle}
Resume Projects: ${parsedResume.projects?.join("; ") || "None"}
Skills: ${parsedResume.skills?.join(", ") || "None"}
${githubReport ? `GitHub Top Repos: ${githubReport.topRepositories?.map((r) => `${r.name} (${r.language}, complexity: ${r.complexity})`).join(", ")}` : ""}`;

  try {
    const result = await callLLMJson<ProjectEvalOutput>(systemPrompt, userPrompt);
    return {
      score: result.relevance_score || 0,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: result.notable_projects || [],
      weaknesses: [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err }, "Project evaluation failed");
    return {
      score: 50,
      confidence: 0,
      summary: "Project evaluation failed",
      strengths: [],
      weaknesses: [],
      metadata: {
        project_complexity: "medium",
        relevance_score: 50,
        notable_projects: [],
        technical_depth: "Could not evaluate",
        confidence: 0,
        explanation: "Evaluation failed",
      },
    } as any;
  }
}
