import { Router } from "express";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { Workflow } from "../models/Workflow";
import { IntelligenceReport } from "../models/IntelligenceReport";
import { RoleRecommendation } from "../models/RoleRecommendation";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const [totalJobs, totalCandidates, workflows, candidates, roleRecs] = await Promise.all([
      Job.countDocuments({ status: "active" }),
      Candidate.countDocuments(),
      Workflow.find().sort({ createdAt: -1 }).lean(),
      Candidate.find().sort({ matchScore: -1 }).limit(20).lean(),
      RoleRecommendation.find().lean(),
    ]);

    const shortlisted = await Candidate.countDocuments({ status: "shortlisted" });
    const rejected = await Candidate.countDocuments({ status: "rejected" });
    const running = workflows.filter((w) => w.status === "running").length;
    const completed = workflows.filter((w) => w.status === "completed").length;
    const paused = workflows.filter((w) => w.status === "paused").length;
    const failed = workflows.filter((w) => w.status === "failed").length;

    // Average match score
    const withScores = candidates.filter((c) => c.matchScore != null);
    const avgMatchScore =
      withScores.length > 0
        ? Math.round(withScores.reduce((sum, c) => sum + (c.matchScore || 0), 0) / withScores.length)
        : 0;

    // Talent rediscovery — candidates with better role matches
    const rediscovery = await Promise.all(
      candidates.slice(0, 5).map(async (c) => {
        const roleRec = roleRecs.find((r) => String(r.candidateId) === String(c._id));
        if (!roleRec || !roleRec.recommendedRoles?.length) return null;
        const bestRole = roleRec.recommendedRoles.sort(
          (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
        )[0];
        if (!bestRole) return null;
        return {
          candidateId: String(c._id),
          name: c.name,
          currentRoleScore: c.matchScore || 0,
          betterRoleTitle: bestRole.roleTitle,
          betterRoleScore: bestRole.matchScore,
          betterRoleJobId: bestRole.jobId,
        };
      }),
    );

    // Recent activity
    const recentCandidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentActivity = recentCandidates.map((c) => ({
      id: String(c._id),
      type: "candidate_added",
      candidateId: String(c._id),
      candidateName: c.name,
      status: c.status,
      createdAt: c.createdAt,
    }));

    res.json({
      totalJobs,
      totalCandidates,
      shortlisted,
      rejected,
      avgMatchScore,
      workflowStatus: { running, completed, paused, failed },
      talentRediscovery: rediscovery.filter(Boolean),
      recentActivity,
    });
  } catch {
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
