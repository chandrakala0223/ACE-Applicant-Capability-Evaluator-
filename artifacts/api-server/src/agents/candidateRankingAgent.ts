import { IntelligenceReport } from "../models/IntelligenceReport";
import { Candidate } from "../models/Candidate";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";

export async function runCandidateRankingAgent(
  jobId: Types.ObjectId | string,
  newCandidateId: Types.ObjectId | string,
): Promise<any> {
  try {
    // Get all candidates for this job
    const candidates = await Candidate.find({ jobId })
      .select("_id matchScore overallScore status")
      .lean();

    if (candidates.length === 0) {
      return {
        score: 100,
        confidence: 100,
        summary: "No candidates to rank",
        strengths: [],
        weaknesses: [],
        metadata: { candidatesRanked: 0 }
      };
    }

    // Sort by overallScore descending, falling back to matchScore
    const sorted = [...candidates].sort((a, b) => {
      const scoreB = b.overallScore ?? b.matchScore ?? 0;
      const scoreA = a.overallScore ?? a.matchScore ?? 0;
      return scoreB - scoreA;
    });

    // Update ranking positions for all candidates
    const updateOps = sorted.flatMap((c, index) => {
      const rank = index + 1;
      return [
        IntelligenceReport.findOneAndUpdate(
          { candidateId: c._id, jobId },
          { rankingPosition: rank },
          { new: true }
        ),
        Candidate.findByIdAndUpdate(
          c._id,
          { rank },
          { new: true }
        )
      ];
    });

    await Promise.allSettled(updateOps);

    logger.info({ jobId, candidatesRanked: sorted.length }, "Candidate ranking updated");

    const currentRank = sorted.findIndex(c => String(c._id) === String(newCandidateId)) + 1;

    return {
      score: 100,
      confidence: 100,
      summary: `Ranked ${sorted.length} candidates. Current candidate rank is #${currentRank}`,
      strengths: [],
      weaknesses: [],
      metadata: {
        candidatesRanked: sorted.length,
        currentRank
      }
    };
  } catch (err) {
    logger.error({ err, jobId, newCandidateId }, "Candidate ranking agent failed");
    return {
      score: 0,
      confidence: 0,
      summary: "Ranking failed",
      strengths: [],
      weaknesses: [],
      metadata: { error: String(err) }
    };
  }
}

export async function getJobRanking(
  jobId: Types.ObjectId | string,
): Promise<Array<{ candidateId: string; matchScore: number; rankingPosition: number }>> {
  const reports = await IntelligenceReport.find({ jobId })
    .select("candidateId rankingPosition")
    .lean();

  const candidates = await Candidate.find({ jobId })
    .select("_id matchScore overallScore status name email")
    .lean();

  const candidateMap = new Map(candidates.map((c) => [String(c._id), c]));

  return reports
    .map((r) => {
      const c = candidateMap.get(String(r.candidateId));
      return {
        candidateId: String(r.candidateId),
        matchScore: c?.overallScore || c?.matchScore || 0,
        rankingPosition: r.rankingPosition || 999,
      };
    })
    .sort((a, b) => a.rankingPosition - b.rankingPosition);
}
