import { callLLMJson } from "../lib/llm";
import { logger } from "../lib/logger";
import type { IParsedResume } from "../models/Candidate";

export interface InterviewAgentOutput {
  technical_questions: string[];
  behavioral_questions: string[];
  coding_tasks: string[];
  evaluation_rubric: Record<string, string>;
  estimated_duration_minutes: number;
}

export async function runInterviewAgent(
  jobTitle: string,
  parsedResume: IParsedResume,
  requiredSkills: string[],
): Promise<InterviewAgentOutput> {
  const systemPrompt = `You are a senior technical interviewer designing a comprehensive interview for a software engineering role.
Generate targeted interview questions based on the candidate's profile and the role requirements.`;

  const userPrompt = `Generate an interview plan and return JSON:
{
  "technical_questions": ["5-7 technical questions tailored to skills"],
  "behavioral_questions": ["3-4 behavioral/cultural questions"],
  "coding_tasks": ["1-2 coding challenges relevant to the role"],
  "evaluation_rubric": {"criterion": "description of what excellent looks like"},
  "estimated_duration_minutes": 60
}

Role: ${jobTitle}
Required Skills: ${requiredSkills.join(", ")}
Candidate Skills: ${parsedResume.skills?.join(", ") || "Not specified"}
Experience: ${parsedResume.experience || 0} years
Projects: ${parsedResume.projects?.slice(0, 3).join("; ") || "None listed"}`;

  try {
    const result = await callLLMJson<InterviewAgentOutput>(systemPrompt, userPrompt);
    logger.info({ jobTitle }, "Interview questions generated");
    return {
      score: 100,
      confidence: 100,
      summary: "Interview questions generated",
      strengths: [],
      weaknesses: [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err }, "Interview agent failed");
    return {
      score: 0,
      confidence: 0,
      summary: "Interview questions generation failed",
      strengths: [],
      weaknesses: [],
      metadata: {
        technical_questions: [],
        behavioral_questions: [],
        coding_tasks: [],
        evaluation_rubric: {},
        estimated_duration_minutes: 60,
      },
    } as any;
  }
}
