import { Router } from "express";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { IntelligenceReport } from "../models/IntelligenceReport";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const [candidates, jobs, reports] = await Promise.all([
      Candidate.find().lean(),
      Job.find().lean(),
      IntelligenceReport.find().lean(),
    ]);

    // Hiring funnel
    const hiringFunnel = {
      total: candidates.length,
      shortlisted: candidates.filter(c => c.status === "shortlisted").length,
      rejected: candidates.filter(c => c.status === "rejected").length,
      hold: candidates.filter(c => c.status === "hold").length,
      approved: candidates.filter(c => c.status === "approved").length,
    };

    // Avg match score
    const scored = candidates.filter(c => c.matchScore != null && c.matchScore > 0);
    const avgMatchScore = scored.length > 0
      ? Math.round(scored.reduce((s, c) => s + (c.matchScore || 0), 0) / scored.length)
      : 0;

    // Avg confidence from intelligence reports
    const conf = reports.filter(r => r.confidence != null && r.confidence > 0);
    const avgConfidence = conf.length > 0
      ? Math.round(conf.reduce((s, r) => s + (r.confidence || 0), 0) / conf.length)
      : 0;

    // Skill distribution — top 15 skills
    const skillCount: Record<string, number> = {};
    for (const c of candidates) {
      for (const skill of (c.parsedResume?.skills || [])) {
        const k = String(skill).trim();
        if (k) skillCount[k] = (skillCount[k] || 0) + 1;
      }
    }
    const skillDistribution = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));

    // Experience distribution
    const expBuckets: Record<string, number> = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
    for (const c of candidates) {
      const exp = c.parsedResume?.experience || 0;
      if (exp <= 2) expBuckets["0-2"]++;
      else if (exp <= 5) expBuckets["3-5"]++;
      else if (exp <= 10) expBuckets["6-10"]++;
      else expBuckets["10+"]++;
    }
    const experienceDistribution = Object.entries(expBuckets).map(([range, count]) => ({ range, count }));

    // Top jobs by candidate count and avg score
    const jobCandidates: Record<string, { count: number; scores: number[] }> = {};
    for (const c of candidates) {
      const jid = String(c.jobId);
      if (!jobCandidates[jid]) jobCandidates[jid] = { count: 0, scores: [] };
      jobCandidates[jid].count++;
      if (c.matchScore) jobCandidates[jid].scores.push(c.matchScore);
    }
    const jobMap = new Map(jobs.map(j => [String(j._id), j.title]));
    const topJobs = Object.entries(jobCandidates)
      .map(([jobId, data]) => ({
        title: String(jobMap.get(jobId) || "Unknown"),
        candidateCount: data.count,
        avgScore: data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0,
      }))
      .sort((a, b) => b.candidateCount - a.candidateCount)
      .slice(0, 10);

    // Hiring trend — last 30 days by day
    const now = new Date();
    const days = 30;
    const trend: Array<{ date: string; applications: number; shortlisted: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayStart = new Date(dateStr + "T00:00:00.000Z");
      const dayEnd = new Date(dateStr + "T23:59:59.999Z");
      const dayApps = candidates.filter(c => {
        const cd = new Date(c.createdAt as Date);
        return cd >= dayStart && cd <= dayEnd;
      });
      trend.push({
        date: dateStr,
        applications: dayApps.length,
        shortlisted: dayApps.filter(c => c.status === "shortlisted").length,
      });
    }

    res.json({
      hiringFunnel,
      avgMatchScore,
      avgConfidence,
      skillDistribution,
      experienceDistribution,
      topJobs,
      hiringTrend: trend,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
