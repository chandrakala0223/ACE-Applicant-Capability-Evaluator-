import { loadShortlistingThresholds } from "../lib/specLoader";
import { Candidate } from "../models/Candidate";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";

export interface ShortlistingOutput {
  decision: "shortlisted" | "hold";
  score: number;
  threshold_used: number;
  explanation: string;
}

export async function runShortlistingAgent(
  candidateId: Types.ObjectId | string,
  matchScore: number,
): Promise<ShortlistingOutput> {
  // Load thresholds from spec — NEVER hardcode
  const thresholds = loadShortlistingThresholds();

  let decision: "shortlisted" | "hold";
  let threshold_used: number;

  if (matchScore >= thresholds.shortlist) {
    decision = "shortlisted";
    threshold_used = thresholds.shortlist;
  } else {
    decision = "hold";
    threshold_used = thresholds.hold_min;
  }

  const explanation = `Score ${matchScore} — ${
    decision === "shortlisted"
      ? `Meets or exceeds shortlist threshold (${thresholds.shortlist})`
      : `Below shortlist threshold (${thresholds.shortlist}) and placed on hold for recruiter review`
  }`;

  // Update candidate status
  await Candidate.findByIdAndUpdate(candidateId, { status: decision, matchScore });

  logger.info(
    { candidateId, decision, matchScore, threshold: threshold_used },
    "Shortlisting decision made",
  );

  return {
    score: matchScore,
    confidence: 100,
    summary: explanation,
    strengths: decision === "shortlisted" ? ["Meets shortlist requirements"] : [],
    weaknesses: decision === "hold" ? ["Below shortlist threshold"] : [],
    metadata: { decision, score: matchScore, threshold_used, explanation },
  } as any;
}
