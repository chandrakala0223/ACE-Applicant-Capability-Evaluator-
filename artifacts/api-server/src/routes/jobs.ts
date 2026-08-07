import { Router } from "express";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { IntelligenceReport } from "../models/IntelligenceReport";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/jobs
router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      title?: string;
      description?: string;
      requiredSkills?: string[];
      preferredSkills?: string[];
      minExperience?: number;
      workflowSpecId?: string;
    };

    if (!body.title || !body.description) {
      res.status(400).json({ error: "title and description are required" });
      return;
    }

    const job = await Job.create({
      title: body.title,
      description: body.description,
      requiredSkills: body.requiredSkills || [],
      preferredSkills: body.preferredSkills || [],
      minExperience: body.minExperience ?? null,
      workflowSpecId: body.workflowSpecId || "default-hiring-workflow",
    });
    res.status(201).json(job);
  } catch {
    res.status(500).json({ error: "Failed to create job" });
  }
});

// GET /api/jobs
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter["status"] = status;
    if (search) filter["title"] = { $regex: String(search), $options: "i" };

    const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();

    const counts = await Candidate.aggregate([
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c: { _id: unknown; count: number }) => [String(c._id), c.count]));

    const withCounts = jobs.map((j) => ({
      ...j,
      id: String(j._id),
      candidateCount: countMap.get(String(j._id)) || 0,
    }));

    res.json(withCounts);
  } catch {
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// GET /api/jobs/:jobId
router.get("/:jobId", requireAuth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).lean();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const candidateCount = await Candidate.countDocuments({ jobId: req.params.jobId });
    res.json({ ...job, id: String(job._id), candidateCount });
  } catch {
    res.status(404).json({ error: "Job not found" });
  }
});

// PUT /api/jobs/:jobId
router.put("/:jobId", requireAuth, async (req, res) => {
  try {
    const allowed = ["title", "description", "requiredSkills", "preferredSkills", "minExperience", "status", "workflowSpecId"];
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const job = await Job.findByIdAndUpdate(req.params.jobId, update, { new: true });
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  } catch {
    res.status(500).json({ error: "Failed to update job" });
  }
});

// GET /api/jobs/:jobId/candidates/ranked
router.get("/:jobId/candidates/ranked", requireAuth, async (req, res) => {
  try {
    const candidates = await Candidate.find({ jobId: req.params.jobId })
      .sort({ matchScore: -1 })
      .lean();

    const reports = await IntelligenceReport.find({ jobId: req.params.jobId }).lean();
    const reportMap = new Map(reports.map((r) => [String(r.candidateId), r]));

    const ranked = candidates.map((c, i) => {
      const report = reportMap.get(String(c._id));
      return {
        ...c,
        id: String(c._id),
        rankingPosition: report?.rankingPosition || i + 1,
        hiringRecommendation: report?.hiringRecommendation,
        confidence: report?.confidence,
      };
    });

    res.json(ranked);
  } catch {
    res.status(500).json({ error: "Failed to get ranked candidates" });
  }
});

// GET /api/jobs/:jobId/pipeline
router.get("/:jobId/pipeline", requireAuth, async (req, res) => {
  try {
    const candidates = await Candidate.find({ jobId: req.params.jobId }).lean();

    const counts = {
      total: candidates.length,
      pending: candidates.filter((c) => c.status === "pending").length,
      shortlisted: candidates.filter((c) => c.status === "shortlisted").length,
      hold: candidates.filter((c) => c.status === "hold").length,
      rejected: candidates.filter((c) => c.status === "rejected").length,
      approved: candidates.filter((c) => c.status === "approved").length,
    };

    const workflows = await Workflow.find({ jobId: req.params.jobId }).lean();
    const workflowIds = workflows.map((w) => w._id);
    const logs = await WorkflowLog.find({ workflowId: { $in: workflowIds } })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ counts, workflows, logs });
  } catch {
    res.status(500).json({ error: "Failed to get pipeline" });
  }
});

// DELETE /api/jobs/:jobId
router.delete("/:jobId", requireAuth, async (req, res) => {
  try {
    const count = await Candidate.countDocuments({ jobId: req.params.jobId });
    if (count > 0) {
      res.status(400).json({ error: "Cannot delete a job that has candidates. Close it instead." });
      return;
    }
    const job = await Job.findByIdAndDelete(req.params.jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Failed to delete job" }); }
});

// POST /api/jobs/:jobId/duplicate
router.post("/:jobId/duplicate", requireAuth, async (req, res) => {
  try {
    const original = await Job.findById(req.params.jobId).lean();
    if (!original) { res.status(404).json({ error: "Job not found" }); return; }
    const copy = await Job.create({
      title: "Copy of " + original.title,
      description: original.description,
      requiredSkills: original.requiredSkills,
      preferredSkills: original.preferredSkills,
      minExperience: original.minExperience,
      workflowSpecId: original.workflowSpecId,
      status: "active",
    });
    res.status(201).json({ ...copy.toObject(), id: String(copy._id) });
  } catch { res.status(500).json({ error: "Failed to duplicate job" }); }
});

// POST /api/jobs/:jobId/publish
router.post("/:jobId/publish", requireAuth, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.jobId, { status: "active" }, { new: true });
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json({ ...job.toObject(), id: String(job._id) });
  } catch { res.status(500).json({ error: "Failed to publish job" }); }
});

// POST /api/jobs/:jobId/close
router.post("/:jobId/close", requireAuth, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.jobId, { status: "closed" }, { new: true });
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json({ ...job.toObject(), id: String(job._id) });
  } catch { res.status(500).json({ error: "Failed to close job" }); }
});

export default router;

