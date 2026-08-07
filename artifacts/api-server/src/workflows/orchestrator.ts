import path from "path";
import fs from "fs";
import type { HydratedDocument } from "mongoose";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { Candidate, type ICandidate } from "../models/Candidate";
import { Job, type IJob } from "../models/Job";
import { GitHubReport } from "../models/GitHubReport";
import { loadWorkflowSpec, loadRetryPolicy } from "../lib/specLoader";
import { runResumeParser } from "../agents/resumeParser";
import { runEmbeddingAgent } from "../agents/embeddingAgent";
import { runGithubAgent } from "../agents/githubAgent";
import { runLinkedinAgent } from "../agents/linkedinAgent";
import { runPortfolioAgent } from "../agents/portfolioAgent";
import { runCodingProfileAgent } from "../agents/codingProfileAgent";
import { runSkillMatchingAgent } from "../agents/skillMatchingAgent";
import { runProjectEvalAgent } from "../agents/projectEvalAgent";
import { runShortlistingAgent } from "../agents/shortlistingAgent";
import { runRoleRecommendationAgent } from "../agents/roleRecommendationAgent";
import { runHiringRecommendationAgent } from "../agents/hiringRecommendationAgent";
import { runCandidateRankingAgent } from "../agents/candidateRankingAgent";
import { runInterviewAgent } from "../agents/interviewAgent";
import { sendInterviewInvitation, sendRejectionEmail } from "../agents/emailAgent";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";

type WorkflowLogStatus = "success" | "failed" | "retrying" | "skipped" | "waiting_approval";

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  resume_parser: "Resume Parser",
  embedding_agent: "Embedding Agent",
  github_analysis_agent: "GitHub Analysis",
  linkedin_analysis_agent: "LinkedIn Analysis",
  portfolio_agent: "Portfolio Analyzer",
  coding_profile_agent: "Coding Profile",
  skill_matching_agent: "Skill Matching",
  project_evaluation_agent: "Project Evaluation",
  shortlisting_agent: "Shortlisting",
  role_recommendation_agent: "Role Recommendation",
  hiring_recommendation_agent: "Hiring Recommendation",
  candidate_ranking_agent: "Candidate Ranking",
  human_approval: "Human Approval Gate",
  interview_agent: "Interview Question Generator",
  email_agent: "Email Notification",
};

export async function startWorkflow(
  candidateId: Types.ObjectId | string,
  jobId: Types.ObjectId | string,
  workflowSpecId = "default-hiring-workflow",
): Promise<string> {
  const workflow = await Workflow.create({
    candidateId,
    jobId,
    currentState: "resume_parser",
    status: "running",
    checkpoint: { workflowSpecId },
  });

  await Candidate.findByIdAndUpdate(candidateId, { workflowId: workflow._id });

  void executeWorkflow(String(workflow._id), workflowSpecId);

  return String(workflow._id);
}

export async function executeWorkflow(workflowId: string, specId: string): Promise<void> {
  const retryPolicy = loadRetryPolicy();
  const workflowSpec = loadWorkflowSpec(specId);
  const steps = workflowSpec.workflow;

  const workflow = await Workflow.findById(workflowId);
  if (!workflow) return;

  let candidate = await Candidate.findById(workflow.candidateId);
  const job = await Job.findById(workflow.jobId);
  if (!candidate || !job) {
    await Workflow.findByIdAndUpdate(workflowId, { status: "failed" });
    return;
  }

  const state: Record<string, unknown> = {
    ...(workflow.checkpoint as Record<string, unknown>),
    candidateId: String(candidate._id),
    jobId: String(job._id),
    jobTitle: job.title,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    minExperience: job.minExperience || 0,
  };

  const currentStep = workflow.currentState || steps[0];
  const startIndex = steps.indexOf(currentStep);
  const remainingSteps = startIndex >= 0 ? steps.slice(startIndex) : steps;

  for (const step of remainingSteps) {
    if (step === "human_approval") {
      await handleHumanApprovalGate(workflowId);
      return;
    }

    await Workflow.findByIdAndUpdate(workflowId, { currentState: step });

    let success = false;
    let retryCount = 0;
    let lastError = "";

    while (!success && retryCount <= retryPolicy.max_retries) {
      if (retryCount > 0) {
        await sleep(retryPolicy.retry_delay_ms);
        await logStep(workflowId, step, "retrying", null, null, lastError, retryCount);
      }

      const start = Date.now();
      try {
        const output = await runStep(step, candidate, job, state);
        const elapsed = Date.now() - start;
        state[step] = output;
        await logStep(workflowId, step, "success", null, output as Record<string, unknown>, null, retryCount, elapsed, getOutputSummary(step, output));
        success = true;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const elapsed = Date.now() - start;
        logger.error({ err, step, workflowId, retryCount }, "Agent step failed");

        const isRetryable = retryPolicy.retryable_errors.some((e) => lastError.includes(e));
        if (!isRetryable || retryCount >= retryPolicy.max_retries) {
          await logStep(workflowId, step, "failed", null, null, lastError, retryCount, elapsed);
          if (!isRetryable) break;
        }
        retryCount++;
      }
    }

    if (!success) {
      logger.warn({ step, workflowId }, "Step failed — continuing workflow");
    }
  }

  await Workflow.findByIdAndUpdate(workflowId, { status: "completed", completedAt: new Date() });
  logger.info({ workflowId }, "Workflow completed");
}

async function runStep(
  step: string,
  candidate: HydratedDocument<ICandidate>,
  job: HydratedDocument<IJob>,
  state: Record<string, unknown>,
): Promise<unknown> {
  switch (step) {
    case "resume_parser": {
      const rawUrl = candidate.resumeUrl ?? "";
      // resumeUrl is stored as the full path from multer (e.g. C:\...\uploads\<file>)
      // Try the stored path first; fall back to reconstructing from basename
      let resumePath: string;
      if (path.isAbsolute(rawUrl) && fs.existsSync(rawUrl)) {
        resumePath = rawUrl;
      } else {
        const filename = rawUrl ? path.basename(rawUrl) : "";
        resumePath = path.resolve(process.cwd(), "uploads", filename);
      }

      logger.info(
        { rawUrl, resumePath, exists: fs.existsSync(resumePath) },
        "[ORCHESTRATOR] resume_parser — resolved file path",
      );

      const result = await runResumeParser(resumePath);
      const parsed = (result as any).metadata;

      logger.info(
        {
          candidateId: String(candidate._id),
          parsedName: parsed.name,
          parsedEmail: parsed.email,
          parsedSkillsCount: parsed.skills?.length ?? 0,
          parsedFields: Object.keys(parsed),
        },
        "[ORCHESTRATOR] resume_parser — writing parsed data to MongoDB",
      );

      await Candidate.findByIdAndUpdate(candidate._id, {
        parsedResume: parsed,
        name: parsed.name || candidate.name,
      });
      candidate = (await Candidate.findById(candidate._id)) || candidate;
      state.parsedResume = parsed;
      return result;
    }

    case "embedding_agent": {
      const pr = state.parsedResume as Record<string, unknown> | undefined;
      const resumeText = [
        String(pr?.name || ""),
        ((pr?.skills as string[]) || []).join(" "),
        String(pr?.education || ""),
        ((pr?.projects as string[]) || []).join(" "),
      ].join(" ");
      return runEmbeddingAgent(String(candidate._id), resumeText);
    }

    case "github_analysis_agent": {
      const pr = candidate.parsedResume;
      return runGithubAgent(candidate._id, pr?.githubUrl || "");
    }

    case "linkedin_analysis_agent": {
      const pr = candidate.parsedResume;
      return runLinkedinAgent(candidate._id, pr?.linkedinUrl || "", pr || null);
    }

    case "portfolio_agent": {
      return runPortfolioAgent(candidate.parsedResume?.portfolioUrl || "");
    }

    case "coding_profile_agent": {
      const pr = candidate.parsedResume;
      return runCodingProfileAgent(
        pr?.leetcodeUrl || "",
        pr?.codeforcesUrl || "",
        pr?.hackerrankUrl || "",
      );
    }

    case "skill_matching_agent": {
      const pr = candidate.parsedResume || {};
      const result = await runSkillMatchingAgent(
        pr,
        job.title,
        job.requiredSkills,
        job.preferredSkills,
        job.minExperience || 0,
      );
      state.matchScore = (result as any).score;
      state.skillMatchResult = (result as any).metadata;
      await Candidate.findByIdAndUpdate(candidate._id, { matchScore: (result as any).score });
      return result;
    }

    case "project_evaluation_agent": {
      const githubReport = await GitHubReport.findOne({ candidateId: candidate._id }).lean();
      return runProjectEvalAgent(candidate.parsedResume || {}, githubReport || null, job.title);
    }

    case "shortlisting_agent": {
      const matchScore = (state.matchScore as number) || candidate.matchScore || 0;
      const result = await runShortlistingAgent(candidate._id, matchScore);
      state.shortlistDecision = (result as any).metadata?.decision || "hold";
      return result;
    }

    case "role_recommendation_agent": {
      const matchScore = (state.matchScore as number) || candidate.matchScore || 0;
      return runRoleRecommendationAgent(
        candidate._id,
        job._id,
        candidate.parsedResume || {},
        matchScore,
      );
    }

    case "hiring_recommendation_agent": {
      const matchScore = (state.matchScore as number) || candidate.matchScore || 0;
      const shortlistDecision = (state.shortlistDecision as string) || candidate.status;
      return runHiringRecommendationAgent(candidate._id, job._id, matchScore, shortlistDecision, state);
    }

    case "candidate_ranking_agent": {
      const result = await runCandidateRankingAgent(job._id, candidate._id);
      return result;
    }

    case "interview_agent": {
      return runInterviewAgent(job.title, candidate.parsedResume || {}, job.requiredSkills);
    }

    case "email_agent": {
      const shortlistDecision = (state.shortlistDecision as string) || candidate.status;
      const interviewOutput = state.interview_agent as { metadata?: { technical_questions?: string[] } } | undefined;
      const questions = interviewOutput?.metadata?.technical_questions || [];

      if (shortlistDecision === "shortlisted") {
        return sendInterviewInvitation(
          candidate.name,
          candidate.email,
          job.title,
          questions,
        );
      }
      return { success: true, skipped: true, reason: "Candidate on hold — no email sent" };
    }

    default:
      logger.warn({ step }, "Unknown workflow step — skipping");
      return null;
  }
}

async function handleHumanApprovalGate(workflowId: string): Promise<void> {
  await Workflow.findByIdAndUpdate(workflowId, {
    currentState: "human_approval",
    status: "paused",
  });
  await logStep(workflowId, "human_approval", "waiting_approval", null, { waiting: true }, null, 0);
  logger.info({ workflowId }, "Workflow paused at human approval gate");
}

export async function resumeWorkflow(
  workflowId: string,
  approved: boolean,
  notes?: string,
): Promise<void> {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow || workflow.status !== "paused") return;

  if (!approved) {
    await Workflow.findByIdAndUpdate(workflowId, { status: "failed" });
    await logStep(workflowId, "human_approval", "failed", null, { approved: false, notes }, "Rejected by recruiter", 0);

    const candidate = await Candidate.findById(workflow.candidateId);
    const job = await Job.findById(workflow.jobId);
    if (candidate && job) {
      await Candidate.findByIdAndUpdate(workflow.candidateId, { status: "rejected" });
      await sendRejectionEmail(candidate.name, candidate.email, job.title);
    }
    return;
  }

  await logStep(workflowId, "human_approval", "success", null, { approved: true, notes }, null, 0);
  await Workflow.findByIdAndUpdate(workflowId, {
    status: "running",
    currentState: "interview_agent",
    checkpoint: {
      ...((workflow.checkpoint as Record<string, unknown>) || {}),
      approvalNotes: notes,
    },
  });

  const spec =
    ((workflow.checkpoint as Record<string, unknown>)?.workflowSpecId as string) ||
    "default-hiring-workflow";
  void executeWorkflow(workflowId, spec);
}

async function logStep(
  workflowId: string,
  agentName: string,
  status: WorkflowLogStatus,
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  error: string | null,
  retryCount: number,
  executionTimeMs?: number,
  outputSummary?: string,
): Promise<void> {
  await WorkflowLog.create({
    workflowId,
    agentName: AGENT_DISPLAY_NAMES[agentName] || agentName,
    input: input || undefined,
    output: output || undefined,
    status,
    error: error || undefined,
    retryCount,
    executionTimeMs,
    outputSummary,
  });
}

function getOutputSummary(step: string, output: unknown): string {
  if (!output || typeof output !== "object") return "";
  const o = output as Record<string, unknown>;

  switch (step) {
    case "resume_parser": return `Parsed: ${String(o.name || "")}, ${((o.skills as string[]) || []).length} skills`;
    case "skill_matching_agent": return `Score: ${String(o.match_score || 0)}/100 — ${String(o.recommendation || "")}`;
    case "shortlisting_agent": return `Decision: ${String(o.decision || "")} (${String(o.score || 0)}/100)`;
    case "hiring_recommendation_agent": return `Recommendation: ${String(o.hiring_recommendation || "")} (${String(o.confidence || 0)}% confidence)`;
    case "github_analysis_agent": return `GitHub score: ${String(o.github_score || 0)}/100`;
    case "linkedin_analysis_agent": return `LinkedIn score: ${String(o.linkedin_score || 0)}/100`;
    default: return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
