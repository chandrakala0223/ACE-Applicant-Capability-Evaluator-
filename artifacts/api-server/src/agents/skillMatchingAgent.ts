import { callLLMJson } from "../lib/llm";
import { retrieveContext } from "./embeddingAgent";
import { loadHiringSpec } from "../lib/specLoader";
import { logger } from "../lib/logger";
import type { IParsedResume } from "../models/Candidate";

export interface SkillMatchingOutput {
  match_score: number;
  missing_skills: string[];
  supporting_skills: string[];
  recommendation: string;
  confidence: number;
  explanation: string;
  evidence: string[];
  reasoning: string;
  referenced_reports: string[];
}

export async function runSkillMatchingAgent(
  parsedResume: IParsedResume,
  jobTitle: string,
  requiredSkills: string[],
  preferredSkills: string[],
  minExperience: number,
): Promise<SkillMatchingOutput> {
  const hiringSpec = loadHiringSpec(jobTitle);
  const ragContext = await retrieveContext(
    `${jobTitle} ${requiredSkills.join(" ")} skills requirements`,
    5,
  );

  const systemPrompt = `You are an expert technical recruiter performing skill matching analysis.
Compare the candidate's profile against the job requirements and organizational context.
Return an objective assessment with a score from 0-100.
${hiringSpec ? `Hiring spec context: ${JSON.stringify(hiringSpec)}` : ""}`;

  const userPrompt = `Perform skill matching analysis and return JSON:
{
  "match_score": 0-100,
  "missing_skills": ["required skills the candidate lacks"],
  "supporting_skills": ["skills that match the requirements"],
  "recommendation": "Shortlist|Hold|Reject",
  "confidence": 0-100,
  "explanation": "detailed explanation of the score",
  "evidence": ["specific resume items that support the assessment"],
  "reasoning": "step-by-step reasoning",
  "referenced_reports": []
}

Job: ${jobTitle}
Required Skills: ${requiredSkills.join(", ")}
Preferred Skills: ${preferredSkills.join(", ")}
Min Experience: ${minExperience} years

Candidate Profile:
- Skills: ${parsedResume.skills?.join(", ") || "None"}
- Experience: ${parsedResume.experience || 0} years
- Education: ${parsedResume.education || "Not specified"}
- Projects: ${parsedResume.projects?.join("; ") || "None listed"}

RAG Context (organizational hiring intelligence):
${ragContext.length > 0 ? ragContext.join("\n---\n").slice(0, 1000) : "No additional context available"}`;

  try {
    const result = await callLLMJson<SkillMatchingOutput>(systemPrompt, userPrompt);
    logger.info(
      { match_score: result.match_score, recommendation: result.recommendation },
      "Skill matching completed",
    );
    return {
      score: result.match_score || 0,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: result.supporting_skills || [],
      weaknesses: result.missing_skills || [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err }, "Skill matching agent failed");
    return {
      score: 0,
      confidence: 0,
      summary: "Skill matching failed",
      strengths: [],
      weaknesses: [],
      metadata: {
        match_score: 0,
        missing_skills: [],
        supporting_skills: [],
        recommendation: "Hold",
        confidence: 0,
        explanation: "Analysis failed",
        evidence: [],
        reasoning: "",
        referenced_reports: [],
      },
    } as any;
  }
}
