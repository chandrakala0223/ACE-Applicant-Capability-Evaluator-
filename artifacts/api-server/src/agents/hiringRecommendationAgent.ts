import { callLLMJson } from "../lib/llm";
import { IntelligenceReport } from "../models/IntelligenceReport";
import { GitHubReport } from "../models/GitHubReport";
import { LinkedInReport } from "../models/LinkedInReport";
import { RoleRecommendation } from "../models/RoleRecommendation";
import { Candidate } from "../models/Candidate";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";

export interface HiringRecommendationOutput {
  hiring_recommendation: "Hire" | "Hold";
  confidence: number;
  explanation: string;
  overall_score: number;
  factor_scores: {
    resume: number;
    skillMatching: number;
    projectEvaluation: number;
    experience: number;
    github: number;
    education: number;
    codingProfiles: number;
    portfolio: number;
  };
  strengths: string[];
  weaknesses: string[];
  matched_skills: string[];
  missing_skills: string[];
  project_quality: string;
  github_quality: string;
  experience_analysis: string;
  improvement_suggestions: string[];
  recommended_roles: string[];
  reasoning: string;
  evidence: string[];
  referenced_reports: string[];
}

export async function runHiringRecommendationAgent(
  candidateId: Types.ObjectId | string,
  jobId: Types.ObjectId | string,
  matchScore: number,
  shortlistDecision: string,
  state?: Record<string, any>,
): Promise<any> {
  // Gather all upstream reports
  const [githubReport, linkedinReport, roleRec] = await Promise.all([
    GitHubReport.findOne({ candidateId }).lean(),
    LinkedInReport.findOne({ candidateId }).lean(),
    RoleRecommendation.findOne({ candidateId }).lean(),
  ]);

  const referencedReports: string[] = [];
  if (githubReport) referencedReports.push(String(githubReport._id));
  if (linkedinReport) referencedReports.push(String(linkedinReport._id));
  if (roleRec) referencedReports.push(String(roleRec._id));

  // Extract fallbacks from state if available
  const resumeAgentOutput = state?.resume_parser;
  const githubAgentOutput = state?.github_analysis_agent;
  const linkedinAgentOutput = state?.linkedin_analysis_agent;
  const portfolioAgentOutput = state?.portfolio_agent;
  const codingAgentOutput = state?.coding_profile_agent;
  const skillAgentOutput = state?.skill_matching_agent;
  const projectAgentOutput = state?.project_evaluation_agent;

  const fallbackSkillScore = skillAgentOutput?.score ?? skillAgentOutput?.match_score ?? matchScore;
  const fallbackGithubScore = githubAgentOutput?.score ?? githubAgentOutput?.github_score ?? githubReport?.githubScore ?? 0;
  const fallbackProjectScore = projectAgentOutput?.score ?? projectAgentOutput?.relevance_score ?? 0;
  const fallbackExperienceScore = linkedinAgentOutput?.score ?? linkedinAgentOutput?.linkedin_score ?? (linkedinReport?.yearsOfExperience ? Math.min(100, linkedinReport.yearsOfExperience * 10) : 50);
  const fallbackEducationScore = linkedinReport?.education?.length ? 80 : 60;
  const fallbackPortfolioScore = portfolioAgentOutput?.score ?? portfolioAgentOutput?.quality_score ?? 0;
  const fallbackCodingScore = codingAgentOutput?.score ?? codingAgentOutput?.overall_coding_score ?? 0;
  const fallbackResumeScore = resumeAgentOutput?.score ?? 70;

  const systemPrompt = `You are a senior hiring manager synthesizing all AI analysis outputs into a final, explainable hiring recommendation.
Provide a comprehensive recommendation backed by evidence from all available signals.
Your output must be fully explainable so recruiters can understand the reasoning.`;

  const userPrompt = `Synthesize all available data into a final hiring recommendation and return JSON:
{
  "hiring_recommendation": "Hire|Hold",
  "confidence": 0-100,
  "overall_score": 0-100,
  "factor_scores": {
    "resume": 0-100,
    "skillMatching": 0-100,
    "projectEvaluation": 0-100,
    "experience": 0-100,
    "github": 0-100,
    "education": 0-100,
    "codingProfiles": 0-100,
    "portfolio": 0-100
  },
  "explanation": "comprehensive explanation of the recommendation",
  "strengths": ["top strengths from the profile"],
  "weaknesses": ["primary weaknesses or areas to improve"],
  "matched_skills": ["skills that align closely with the role"],
  "missing_skills": ["skills that are not evident or need improvement"],
  "project_quality": "summary of project quality",
  "github_quality": "summary of GitHub quality",
  "experience_analysis": "summary of experience fit",
  "improvement_suggestions": ["practical suggestions for improvement"],
  "recommended_roles": ["job titles or roles the candidate may fit"],
  "reasoning": "detailed step-by-step reasoning trail",
  "evidence": ["specific data points from upstream analysis"],
  "referenced_reports": ${JSON.stringify(referencedReports)}
}

Scoring weights:
- Resume Analysis: 20%
- Skill Matching: 25%
- Project Evaluation: 15%
- Experience: 10%
- GitHub Analysis: 15%
- Education: 5%
- Coding Profiles: 5%
- Portfolio: 5%

Use the weighted total to compute "overall_score".
Use the provided scores as the foundation for the final score.
If any input is missing, base the score on available signals and note the missing signal in your explanation.

Available Analysis Data:
- Skill Match Score: ${fallbackSkillScore}/100
- GitHub Score: ${fallbackGithubScore}/100
- Project Evaluation Score: ${fallbackProjectScore}/100
- Experience Score: ${fallbackExperienceScore}/100
- Education Score: ${fallbackEducationScore}/100
- Portfolio Quality Score: ${fallbackPortfolioScore}/100
- Coding Profile Score: ${fallbackCodingScore}/100
- Resume Score: ${fallbackResumeScore}/100`;

  try {
    const result = await callLLMJson<HiringRecommendationOutput>(systemPrompt, userPrompt);

    const factorScores = {
      resume: result.factor_scores?.resume ?? fallbackResumeScore,
      skillMatching: result.factor_scores?.skillMatching ?? fallbackSkillScore,
      projectEvaluation: result.factor_scores?.projectEvaluation ?? fallbackProjectScore,
      experience: result.factor_scores?.experience ?? fallbackExperienceScore,
      github: result.factor_scores?.github ?? fallbackGithubScore,
      education: result.factor_scores?.education ?? fallbackEducationScore,
      codingProfiles: result.factor_scores?.codingProfiles ?? fallbackCodingScore,
      portfolio: result.factor_scores?.portfolio ?? fallbackPortfolioScore,
    };

    const overallScore = result.overall_score ??
      Math.round(
        factorScores.resume * 0.20 +
        factorScores.skillMatching * 0.25 +
        factorScores.projectEvaluation * 0.15 +
        factorScores.experience * 0.10 +
        factorScores.github * 0.15 +
        factorScores.education * 0.05 +
        factorScores.codingProfiles * 0.05 +
        factorScores.portfolio * 0.05,
      );

    const decision = result.hiring_recommendation || "Hold";

    // Update IntelligenceReport
    await IntelligenceReport.findOneAndUpdate(
      { candidateId, jobId },
      {
        candidateId,
        jobId,
        overallScore,
        matchScore,
        factorScores,
        hiringRecommendation: decision,
        confidence: result.confidence || 0,
        explanation: result.explanation || "",
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        matchedSkills: result.matched_skills || [],
        missingSkills: result.missing_skills || [],
        projectQuality: result.project_quality || "",
        githubQuality: result.github_quality || "",
        experienceAnalysis: result.experience_analysis || "",
        improvementSuggestions: result.improvement_suggestions || [],
        recommendedRoles: result.recommended_roles || [],
        reasoning: result.reasoning || "",
        evidence: result.evidence || [],
        referencedReports: result.referenced_reports || referencedReports,
      },
      { upsert: true, new: true },
    );

    // Store in Candidate model
    await Candidate.findByIdAndUpdate(candidateId, {
      overallScore,
      resumeScore: factorScores.resume,
      githubScore: factorScores.github,
      skillScore: factorScores.skillMatching,
      projectScore: factorScores.projectEvaluation,
      experienceScore: factorScores.experience,
      educationScore: factorScores.education,
      portfolioScore: factorScores.portfolio,
      codingScore: factorScores.codingProfiles,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendation: decision,
      confidence: result.confidence || 0,
      status: "hold", // The AI must NEVER automatically reject. Recruiter manually reviews from hold.
    });

    logger.info(
      { candidateId, recommendation: decision, confidence: result.confidence, overallScore },
      "Hiring recommendation generated successfully",
    );

    return {
      score: overallScore,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      metadata: result,
    };
  } catch (err) {
    logger.error({ err, candidateId }, "Hiring recommendation agent failed");
    const fallback: HiringRecommendationOutput = {
      hiring_recommendation: "Hold",
      confidence: 0,
      overall_score: 0,
      factor_scores: {
        resume: fallbackResumeScore,
        skillMatching: fallbackSkillScore,
        projectEvaluation: fallbackProjectScore,
        experience: fallbackExperienceScore,
        github: fallbackGithubScore,
        education: fallbackEducationScore,
        codingProfiles: fallbackCodingScore,
        portfolio: fallbackPortfolioScore,
      },
      explanation: "Analysis failed — defaulting to Hold",
      strengths: [],
      weaknesses: [],
      matched_skills: [],
      missing_skills: [],
      project_quality: "",
      github_quality: "",
      experience_analysis: "",
      improvement_suggestions: [],
      recommended_roles: [],
      reasoning: "",
      evidence: [],
      referenced_reports: referencedReports,
    };

    const overallScore = Math.round(
      fallback.factor_scores.resume * 0.20 +
      fallback.factor_scores.skillMatching * 0.25 +
      fallback.factor_scores.projectEvaluation * 0.15 +
      fallback.factor_scores.experience * 0.10 +
      fallback.factor_scores.github * 0.15 +
      fallback.factor_scores.education * 0.05 +
      fallback.factor_scores.codingProfiles * 0.05 +
      fallback.factor_scores.portfolio * 0.05
    );

    await IntelligenceReport.findOneAndUpdate(
      { candidateId, jobId },
      {
        candidateId,
        jobId,
        overallScore,
        matchScore,
        factorScores: fallback.factor_scores,
        hiringRecommendation: fallback.hiring_recommendation,
        confidence: fallback.confidence,
        explanation: fallback.explanation,
        strengths: fallback.strengths,
        weaknesses: fallback.weaknesses,
        matchedSkills: fallback.matched_skills,
        missingSkills: fallback.missing_skills,
        projectQuality: fallback.project_quality,
        githubQuality: fallback.github_quality,
        experienceAnalysis: fallback.experience_analysis,
        improvementSuggestions: fallback.improvement_suggestions,
        recommendedRoles: fallback.recommended_roles,
        reasoning: fallback.reasoning,
        evidence: fallback.evidence,
        referencedReports: fallback.referenced_reports,
      },
      { upsert: true, new: true },
    );

    await Candidate.findByIdAndUpdate(candidateId, {
      overallScore,
      resumeScore: fallback.factor_scores.resume,
      githubScore: fallback.factor_scores.github,
      skillScore: fallback.factor_scores.skillMatching,
      projectScore: fallback.factor_scores.projectEvaluation,
      experienceScore: fallback.factor_scores.experience,
      educationScore: fallback.factor_scores.education,
      portfolioScore: fallback.factor_scores.portfolio,
      codingScore: fallback.factor_scores.codingProfiles,
      strengths: fallback.strengths,
      weaknesses: fallback.weaknesses,
      recommendation: fallback.hiring_recommendation,
      confidence: fallback.confidence,
      status: "hold",
    });

    return {
      score: overallScore,
      confidence: fallback.confidence,
      summary: fallback.explanation,
      strengths: fallback.strengths,
      weaknesses: fallback.weaknesses,
      metadata: fallback,
    };
  }
}
