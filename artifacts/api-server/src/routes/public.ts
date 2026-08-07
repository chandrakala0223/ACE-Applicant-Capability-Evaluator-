import { Router } from "express";
import mongoose from "mongoose";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { uploadResume } from "../middleware/upload";
import { startWorkflow } from "../workflows/orchestrator";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/public/jobs — public job listings (no auth)
router.get("/jobs", async (_req, res) => {
  try {
    const jobs = await Job.find({ status: "active" })
      .select("title description requiredSkills preferredSkills minExperience createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(jobs.map((j) => ({ ...j, id: String(j._id) })));
  } catch {
    // Return empty array gracefully when DB is unavailable
    res.json([]);
  }
});

// GET /api/public/jobs/:jobId — single public job
router.get("/jobs/:jobId", async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .select("title description requiredSkills preferredSkills minExperience createdAt")
      .lean();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ ...job, id: String(job._id) });
  } catch {
    res.status(404).json({ error: "Job not found" });
  }
});

// POST /api/public/apply — public resume application (no auth)
router.post("/apply", uploadResume, async (req, res) => {
  try {
    const body = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      githubUrl?: string;
      portfolioUrl?: string;
      jobId?: string;
    };

    const { name, email, phone, linkedinUrl, githubUrl, portfolioUrl, jobId } = body;

    // ── UPLOAD LOG ──────────────────────────────────────────────────────────────
    logger.info(
      {
        body: { name, email, phone, linkedinUrl, githubUrl, portfolioUrl, jobId },
        file: req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              path: req.file.path,
              sizeBytes: req.file.size,
            }
          : null,
      },
      "[UPLOAD] Resume application received",
    );

    if (!name || !email || !jobId) {
      res.status(400).json({ error: "name, email, and jobId are required" });
      return;
    }

    if (!req.file) {
      logger.warn({ body }, "[UPLOAD] No PDF file attached to application");
      res.status(400).json({ error: "Resume PDF is required" });
      return;
    }

    const job = await Job.findById(jobId).lean();
    if (!job || job.status !== "active") {
      res.status(404).json({ error: "Job not found or not accepting applications" });
      return;
    }

    const resumeUrl = req.file.path;

    logger.info(
      { resumeUrl, sizeBytes: req.file.size },
      "[UPLOAD] File saved — creating candidate document",
    );

    const candidate = await Candidate.create({
      name,
      email,
      phone: phone || "",
      jobId,
      resumeUrl,
      parsedResume: {
        linkedinUrl: linkedinUrl || "",
        githubUrl: githubUrl || "",
        portfolioUrl: portfolioUrl || "",
      },
      status: "pending",
    });

    logger.info(
      { candidateId: String(candidate._id), name, email },
      "[UPLOAD] Candidate document created — starting workflow",
    );

    const workflowId = await startWorkflow(candidate._id, jobId);

    logger.info(
      { candidateId: String(candidate._id), workflowId },
      "[UPLOAD] Workflow started",
    );

    res.status(201).json({
      success: true,
      candidateId: String(candidate._id),
      workflowId,
      message: "Application submitted successfully. AI processing has started.",
    });
  } catch (err) {
    logger.error(
      { err: (err as Error).message, stack: (err as Error).stack },
      "[UPLOAD] Failed to submit application",
    );
    res.status(500).json({ error: "Failed to submit application", detail: (err as Error).message });
  }
});

export default router;

