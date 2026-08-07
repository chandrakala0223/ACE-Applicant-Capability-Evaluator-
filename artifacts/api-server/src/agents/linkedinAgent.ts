import { callLLMJson } from "../lib/llm";
import { LinkedInReport } from "../models/LinkedInReport";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";
import type { IParsedResume } from "../models/Candidate";

export interface LinkedInAgentOutput {
  linkedin_score: number;
  experience_summary: Record<string, unknown>;
  career_progression: string;
  education: string[];
  certifications: string[];
  skills: string[];
  years_of_experience: number;
  confidence: number;
  explanation: string;
  evidence: string[];
  supportingSkills: string[];
  missingSkills: string[];
  reasoning: string;
  referencedReports: string[];
}

export async function runLinkedinAgent(
  candidateId: Types.ObjectId | string,
  linkedinUrl: string,
  parsedResume: IParsedResume | null,
): Promise<LinkedInAgentOutput | null> {
  // LinkedIn scraping is restricted — we analyze from resume data + URL signal
  const systemPrompt = `You are an expert recruiter analyzing a candidate's professional background.
Based on the available resume data and LinkedIn profile information, generate a comprehensive LinkedIn-style professional assessment.
Return a JSON object assessing career trajectory, experience quality, education, and skills.`;

  const userPrompt = `Analyze this candidate's professional profile and return JSON:
{
  "linkedin_score": 0-100,
  "experience_summary": {"total_years": 0, "current_role": "", "current_company": "", "previous_roles": []},
  "career_progression": "description of career growth",
  "education": ["degree and institution"],
  "certifications": ["relevant certifications"],
  "skills": ["professional skills"],
  "years_of_experience": 0,
  "confidence": 0-100,
  "explanation": "explanation of the score",
  "evidence": ["specific data points that support assessment"],
  "supportingSkills": ["skills that positively impact score"],
  "missingSkills": ["skills that would improve score"],
  "reasoning": "reasoning trail",
  "referencedReports": []
}

LinkedIn URL: ${linkedinUrl || "Not provided"}
Resume data: ${JSON.stringify({
    skills: parsedResume?.skills || [],
    experience: parsedResume?.experience || 0,
    education: parsedResume?.education || "",
    projects: parsedResume?.projects || [],
    name: parsedResume?.name || "",
  }).slice(0, 2000)}`;

  try {
    const result = await callLLMJson<LinkedInAgentOutput>(systemPrompt, userPrompt);

    await LinkedInReport.findOneAndUpdate(
      { candidateId },
      {
        candidateId,
        linkedinScore: result.linkedin_score || 0,
        experienceSummary: result.experience_summary || {},
        careerProgression: result.career_progression || "",
        education: result.education || [],
        certifications: result.certifications || [],
        skills: result.skills || [],
        yearsOfExperience: result.years_of_experience || parsedResume?.experience || 0,
        confidence: result.confidence || 0,
        explanation: result.explanation || "",
        evidence: result.evidence || [],
        supportingSkills: result.supportingSkills || [],
        missingSkills: result.missingSkills || [],
        reasoning: result.reasoning || "",
        referencedReports: result.referencedReports || [],
      },
      { upsert: true, new: true },
    );

    return {
      score: result.linkedin_score || 0,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: result.supportingSkills || [],
      weaknesses: result.missingSkills || [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err, candidateId, linkedinUrl }, "LinkedIn analysis failed");
    return {
      score: 0,
      confidence: 0,
      summary: "LinkedIn analysis failed",
      strengths: [],
      weaknesses: [],
      metadata: {},
    } as any;
  }
}
