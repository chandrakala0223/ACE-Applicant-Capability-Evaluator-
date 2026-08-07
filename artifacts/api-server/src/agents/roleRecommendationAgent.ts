import { callLLMJson } from "../lib/llm";
import { Job } from "../models/Job";
import { RoleRecommendation } from "../models/RoleRecommendation";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";
import type { IParsedResume } from "../models/Candidate";

export interface RoleRecommendationOutput {
  recommended_roles: Array<{
    job_id: string;
    role_title: string;
    match_score: number;
    explanation: string;
    confidence: number;
  }>;
  confidence: number;
  reasoning: string;
}

export async function runRoleRecommendationAgent(
  candidateId: Types.ObjectId | string,
  appliedJobId: Types.ObjectId | string,
  parsedResume: IParsedResume,
  currentMatchScore: number,
): Promise<RoleRecommendationOutput> {
  // Fetch all active jobs except the applied one
  const activeJobs = await Job.find({
    _id: { $ne: appliedJobId },
    status: "active",
  })
    .select("_id title requiredSkills preferredSkills minExperience")
    .lean();

  if (activeJobs.length === 0) {
    const result: RoleRecommendationOutput = {
      recommended_roles: [],
      confidence: 0,
      reasoning: "No other active jobs to compare against",
    };
    await saveRoleRecommendation(candidateId, appliedJobId, result);
    return result;
  }

  const jobsContext = activeJobs.map((j) => ({
    id: String(j._id),
    title: j.title,
    requiredSkills: j.requiredSkills,
    preferredSkills: j.preferredSkills,
    minExperience: j.minExperience,
  }));

  const systemPrompt = `You are the AI Talent Rediscovery engine for an enterprise ATS platform.
Your purpose is to identify which roles across the entire organization would maximize a candidate's potential.
Compare the candidate against ALL provided job openings and return match scores for each.`;

  const userPrompt = `Analyze this candidate against all available roles and return JSON:
{
  "recommended_roles": [
    {
      "job_id": "mongodb_id",
      "role_title": "job title",
      "match_score": 0-100,
      "explanation": "why this role is a good fit",
      "confidence": 0-100
    }
  ],
  "confidence": 0-100,
  "reasoning": "overall reasoning for recommendations"
}

Return only roles with match_score > 50, sorted by match_score descending.

Candidate Profile:
- Skills: ${parsedResume.skills?.join(", ") || "None"}
- Experience: ${parsedResume.experience || 0} years
- Education: ${parsedResume.education || "N/A"}
- Projects: ${parsedResume.projects?.slice(0, 3).join("; ") || "None"}
- Current match score for applied role: ${currentMatchScore}

Available Roles:
${JSON.stringify(jobsContext).slice(0, 3000)}`;

  try {
    const result = await callLLMJson<RoleRecommendationOutput>(systemPrompt, userPrompt);
    await saveRoleRecommendation(candidateId, appliedJobId, result);
    logger.info(
      { candidateId, recommendations: result.recommended_roles?.length },
      "Role recommendations generated",
    );
    return {
      score: result.recommended_roles?.[0]?.match_score || 0,
      confidence: result.confidence || 0,
      summary: result.reasoning || "",
      strengths: result.recommended_roles?.map(r => r.role_title) || [],
      weaknesses: [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err, candidateId }, "Role recommendation agent failed");
    const empty: RoleRecommendationOutput = {
      recommended_roles: [],
      confidence: 0,
      reasoning: "Analysis failed",
    };
    await saveRoleRecommendation(candidateId, appliedJobId, empty);
    return {
      score: 0,
      confidence: 0,
      summary: "Role recommendation failed",
      strengths: [],
      weaknesses: [],
      metadata: empty,
    } as any;
  }
}

async function saveRoleRecommendation(
  candidateId: Types.ObjectId | string,
  appliedJobId: Types.ObjectId | string,
  result: RoleRecommendationOutput,
): Promise<void> {
  await RoleRecommendation.findOneAndUpdate(
    { candidateId },
    {
      candidateId,
      appliedJobId,
      recommendedRoles: result.recommended_roles?.map((r) => ({
        jobId: r.job_id,
        roleTitle: r.role_title,
        matchScore: r.match_score,
        explanation: r.explanation,
        confidence: r.confidence,
      })) || [],
      confidence: result.confidence || 0,
      reasoning: result.reasoning || "",
      referencedReports: [],
    },
    { upsert: true, new: true },
  );
}
