import { Router } from "express";
import path from "path";
import fs from "fs";
import { Candidate } from "../models/Candidate";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { startWorkflow } from "../workflows/orchestrator";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { uploadResume } from "../middleware/upload";

const router = Router();

// POST /api/candidates/upload  (multipart/form-data)
router.post("/upload", optionalAuth, uploadResume, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Resume PDF file is required" });
      return;
    }

    const { name, email, phone, jobId } = req.body as Record<string, string>;

    if (!name || !email || !jobId) {
      res.status(400).json({ error: "name, email, and jobId are required" });
      return;
    }

    const resumeUrl = `/uploads/${req.file.filename}`;

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      jobId,
      resumeUrl,
      status: "pending",
    });

    // Start AI pipeline asynchronously
    const workflowId = await startWorkflow(String(candidate._id), jobId);

    res.status(201).json({
      ...candidate.toJSON(),
      workflowId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload candidate" });
  }
});

// POST /api/candidates/compare
router.post("/compare", requireAuth, async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body as { jobId: string; candidateIds: string[] };

    if (!candidateIds || candidateIds.length < 2) {
      res.status(400).json({ error: "At least 2 candidate IDs required" });
      return;
    }

    const { ComparisonResult } = await import("../models/ComparisonResult");
    const { IntelligenceReport } = await import("../models/IntelligenceReport");
    const { GitHubReport } = await import("../models/GitHubReport");
    const { LinkedInReport } = await import("../models/LinkedInReport");
    const { RoleRecommendation } = await import("../models/RoleRecommendation");
    const { callLLMJson } = await import("../lib/llm");

    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean();

    const slots = await Promise.all(
      candidates.map(async (c) => {
        const [intel, github, linkedin, roleRec] = await Promise.all([
          IntelligenceReport.findOne({ candidateId: c._id, jobId }).lean(),
          GitHubReport.findOne({ candidateId: c._id }).lean(),
          LinkedInReport.findOne({ candidateId: c._id }).lean(),
          RoleRecommendation.findOne({ candidateId: c._id }).lean(),
        ]);

        return {
          candidateId: String(c._id),
          name: c.name,
          email: c.email,
          matchScore: c.matchScore,
          rankingPosition: intel?.rankingPosition,
          githubScore: github?.githubScore,
          linkedinScore: linkedin?.linkedinScore,
          supportingSkills: (intel as any)?.supportingSkills || (intel as any)?.matchedSkills || [],
          missingSkills: intel?.missingSkills || [],
          hiringRecommendation: intel?.hiringRecommendation,
          confidence: intel?.confidence,
          betterRoleFound: (roleRec?.recommendedRoles?.length || 0) > 0,
          recommendedRole: roleRec?.recommendedRoles?.[0]?.roleTitle,
          topProjects: ((c.parsedResume as any)?.projects || []).slice(0, 3).map((p: any) => typeof p === "string" ? p : p?.name || p?.title || ""),
          languages: github?.languages?.slice(0, 5) || [],
          yearsOfExperience: c.parsedResume?.experience,
        };
      }),
    );

    // Generate AI comparison summary
    const aiSummary = await callLLMJson<{ summary: string }>(
      "You are a recruitment AI summarizing a head-to-head candidate comparison.",
      `Compare these candidates for job ${jobId} and return { "summary": "2-3 sentence comparison" }\n${JSON.stringify(slots)}`,
    ).then((r) => r.summary).catch(() => "");

    const comparison = await ComparisonResult.create({ jobId, candidateIds, candidates: slots, aiSummary });

    res.status(201).json(comparison);
  } catch {
    res.status(500).json({ error: "Comparison failed" });
  }
});

// GET /api/candidates/compare/:comparisonId
router.get("/compare/:comparisonId", requireAuth, async (req, res) => {
  try {
    const { ComparisonResult } = await import("../models/ComparisonResult");
    const comparison = await ComparisonResult.findById(req.params.comparisonId).lean();
    if (!comparison) {
      res.status(404).json({ error: "Comparison not found" });
      return;
    }
    res.json({ ...comparison, id: String(comparison._id) });
  } catch {
    res.status(404).json({ error: "Comparison not found" });
  }
});

// GET /api/candidates
router.get("/", requireAuth, async (req, res) => {
  try {
    const { jobId, status, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (jobId) filter.jobId = jobId;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: String(search), $options: "i" };

    const candidates = await Candidate.find(filter).sort({ createdAt: -1 }).lean();
    res.json(candidates.map((c) => ({ ...c, id: String(c._id) })));
  } catch {
    res.status(500).json({ error: "Failed to list candidates" });
  }
});

// GET /api/candidates/:candidateId
router.get("/:candidateId", requireAuth, async (req, res) => {
  try {
    const candidateObj = await Candidate.findById(req.params.candidateId).populate("jobId").lean();
    if (!candidateObj) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    const workflow = await Workflow.findOne({ candidateId: candidateObj._id }).lean();
    const jobTitle = (candidateObj.jobId as any)?.title || "";
    const jobIdStr = String((candidateObj.jobId as any)?._id || candidateObj.jobId);
    res.json({
      ...candidateObj,
      id: String(candidateObj._id),
      jobId: jobIdStr,
      jobTitle,
      workflow,
    });
  } catch {
    res.status(404).json({ error: "Candidate not found" });
  }
});

// GET /api/candidates/:candidateId/github
router.get("/:candidateId/github", requireAuth, async (req, res) => {
  try {
    const { GitHubReport } = await import("../models/GitHubReport");
    const report = await GitHubReport.findOne({ candidateId: req.params.candidateId }).lean();
    if (!report) {
      res.status(404).json({ error: "GitHub report not found — run the AI pipeline first" });
      return;
    }
    res.json({ ...report, id: String(report._id) });
  } catch {
    res.status(404).json({ error: "GitHub report not found" });
  }
});

// POST /api/candidates/:candidateId/github/refresh
router.post("/:candidateId/github/refresh", requireAuth, async (req, res) => {
  try {
    const { GitHubReport } = await import("../models/GitHubReport");
    const { runGithubAgent } = await import("../agents/githubAgent");
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    const githubUrl = candidate.parsedResume?.githubUrl || "";
    const result = await runGithubAgent(String(candidate._id), githubUrl);
    if (!result) {
      res.status(400).json({ error: "No GitHub URL found for candidate" });
      return;
    }
    const report = await GitHubReport.findOne({ candidateId: candidate._id }).lean();
    res.json({ ...report, id: String(report?._id) });
  } catch {
    res.status(500).json({ error: "Failed to refresh GitHub report" });
  }
});

// GET /api/candidates/:candidateId/linkedin
router.get("/:candidateId/linkedin", requireAuth, async (req, res) => {
  try {
    const { LinkedInReport } = await import("../models/LinkedInReport");
    const report = await LinkedInReport.findOne({ candidateId: req.params.candidateId }).lean();
    if (!report) {
      res.status(404).json({ error: "LinkedIn report not found" });
      return;
    }
    res.json({ ...report, id: String(report._id) });
  } catch {
    res.status(404).json({ error: "LinkedIn report not found" });
  }
});

// POST /api/candidates/:candidateId/linkedin/refresh
router.post("/:candidateId/linkedin/refresh", requireAuth, async (req, res) => {
  try {
    const { LinkedInReport } = await import("../models/LinkedInReport");
    const { runLinkedinAgent } = await import("../agents/linkedinAgent");
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    const linkedinUrl = candidate.parsedResume?.linkedinUrl || "";
    await runLinkedinAgent(String(candidate._id), linkedinUrl, candidate.parsedResume || null);
    const report = await LinkedInReport.findOne({ candidateId: candidate._id }).lean();
    res.json({ ...report, id: String(report?._id) });
  } catch {
    res.status(500).json({ error: "Failed to refresh LinkedIn report" });
  }
});

// GET /api/candidates/:candidateId/roles
router.get("/:candidateId/roles", requireAuth, async (req, res) => {
  try {
    const { RoleRecommendation } = await import("../models/RoleRecommendation");
    const rec = await RoleRecommendation.findOne({ candidateId: req.params.candidateId }).lean();
    if (!rec) {
      res.status(404).json({ error: "Role recommendations not found" });
      return;
    }
    res.json({ ...rec, id: String(rec._id) });
  } catch {
    res.status(404).json({ error: "Role recommendations not found" });
  }
});

// POST /api/candidates/:candidateId/roles/refresh
router.post("/:candidateId/roles/refresh", requireAuth, async (req, res) => {
  try {
    const { RoleRecommendation } = await import("../models/RoleRecommendation");
    const { runRoleRecommendationAgent } = await import("../agents/roleRecommendationAgent");
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    await runRoleRecommendationAgent(
      String(candidate._id),
      String(candidate.jobId),
      candidate.parsedResume || {},
      candidate.matchScore || 0,
    );
    const rec = await RoleRecommendation.findOne({ candidateId: candidate._id }).lean();
    res.json({ ...rec, id: String(rec?._id) });
  } catch {
    res.status(500).json({ error: "Failed to refresh role recommendations" });
  }
});

// GET /api/candidates/:candidateId/intelligence
router.get("/:candidateId/intelligence", requireAuth, async (req, res) => {
  try {
    const { IntelligenceReport } = await import("../models/IntelligenceReport");
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    const report = await IntelligenceReport.findOne({
      candidateId: req.params.candidateId,
      jobId: candidate.jobId,
    }).lean();
    if (!report) {
      res.status(404).json({ error: "Intelligence report not found" });
      return;
    }
    res.json({ ...report, id: String(report._id) });
  } catch {
    res.status(404).json({ error: "Intelligence report not found" });
  }
});

// GET /api/candidates/:candidateId/resume
router.get("/:candidateId/resume", optionalAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate || !candidate.resumeUrl) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    let filePath = candidate.resumeUrl;
    if (!path.isAbsolute(filePath)) {
      const filename = path.basename(filePath);
      filePath = path.resolve(process.cwd(), "uploads", filename);
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Resume file not found on server" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    const download = req.query.download === "true";
    if (download) {
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to read resume file" });
  }
});

export default router;
