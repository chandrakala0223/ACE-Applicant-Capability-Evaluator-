import { Router } from "express";
import { ChatMessage } from "../models/ChatHistory";
import { callLLM } from "../lib/llm";
import { Candidate } from "../models/Candidate";
import { Job } from "../models/Job";
import { requireAuth } from "../middleware/auth";
import { IntelligenceReport } from "../models/IntelligenceReport";

const router = Router();

// POST /api/chat
router.post("/", requireAuth, async (req, res) => {
  try {
    const { query } = req.body as { query: string };
    if (!query?.trim()) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const recruiterId = req.user!.userId;

    // Gather recent data for context
    const [recentCandidates, activeJobs, recentIntel] = await Promise.all([
      Candidate.find().sort({ createdAt: -1 }).limit(10).lean(),
      Job.find({ status: "active" }).lean(),
      IntelligenceReport.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const systemPrompt = `You are TalentOS AI Recruiter, an intelligent assistant for an enterprise recruitment platform.
You have access to real-time data about candidates, jobs, and AI assessment results.
Answer recruiter questions accurately, concisely, and professionally.
You can analyze candidate profiles, compare candidates, suggest interview strategies, explain AI scores, and provide hiring insights.
Always be specific and reference actual data when available.

Current system snapshot:
- Active jobs: ${activeJobs.length} (${activeJobs.map((j) => j.title).join(", ")})
- Recent candidates: ${recentCandidates.length} profiles
- Top candidate scores: ${recentCandidates.slice(0, 3).map((c) => `${c.name}: ${c.matchScore || "pending"}%`).join(", ")}
- Recent hiring recommendations: ${recentIntel.map((r) => r.hiringRecommendation).join(", ")}`;

    const userPrompt = `Recruiter query: ${query}

Candidate data context:
${JSON.stringify(
  recentCandidates.map((c) => ({
    name: c.name,
    email: c.email,
    status: c.status,
    matchScore: c.matchScore,
    skills: c.parsedResume?.skills?.slice(0, 5),
  })),
).slice(0, 2000)}`;

    const response = await callLLM(systemPrompt, userPrompt, false);

    const chatMessage = await ChatMessage.create({
      recruiterId,
      query,
      response,
      referencedReports: [],
    });

    res.json({
      id: String(chatMessage._id),
      response,
      referencedReports: [],
      createdAt: chatMessage.createdAt,
    });
  } catch {
    res.status(500).json({ error: "Chat query failed" });
  }
});

// GET /api/chat/:recruiterId
router.get("/:recruiterId", requireAuth, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ recruiterId: req.params.recruiterId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.map((m) => ({ ...m, id: String(m._id) })));
  } catch {
    res.status(500).json({ error: "Failed to get chat history" });
  }
});

export default router;
