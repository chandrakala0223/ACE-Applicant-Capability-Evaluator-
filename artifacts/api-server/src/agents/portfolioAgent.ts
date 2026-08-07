import { callLLMJson } from "../lib/llm";
import { logger } from "../lib/logger";

export interface PortfolioAgentOutput {
  has_portfolio: boolean;
  quality_score: number;
  showcased_projects: string[];
  design_quality: string;
  technical_depth: string;
  confidence: number;
}

export async function runPortfolioAgent(portfolioUrl: string): Promise<PortfolioAgentOutput | null> {
  if (!portfolioUrl) return null;

  let pageContent = "";
  try {
    const res = await fetch(portfolioUrl, {
      headers: { "User-Agent": "TalentOS-AI/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      // Extract text content roughly
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 2000);
    }
  } catch {
    pageContent = "Portfolio URL was not accessible";
  }

  const systemPrompt = `You are evaluating a developer's portfolio website for recruitment purposes.`;
  const userPrompt = `Analyze this portfolio and return JSON:
{
  "has_portfolio": true,
  "quality_score": 0-100,
  "showcased_projects": ["list of projects found"],
  "design_quality": "assessment",
  "technical_depth": "assessment",
  "confidence": 0-100
}

Portfolio URL: ${portfolioUrl}
Page content snippet: ${pageContent}`;

  try {
    const result = await callLLMJson<PortfolioAgentOutput>(systemPrompt, userPrompt);
    return {
      score: result.quality_score || 0,
      confidence: result.confidence || 0,
      summary: result.design_quality || "",
      strengths: result.showcased_projects || [],
      weaknesses: [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err, portfolioUrl }, "Portfolio analysis failed");
    return {
      score: 50,
      confidence: 0,
      summary: "Portfolio analysis failed",
      strengths: [],
      weaknesses: [],
      metadata: { has_portfolio: true, quality_score: 50, showcased_projects: [], design_quality: "Unknown", technical_depth: "Unknown", confidence: 0 },
    } as any;
  }
}
