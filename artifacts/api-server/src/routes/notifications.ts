import { Router } from "express";
import { WorkflowLog } from "../models/WorkflowLog";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/notifications — derive from recent workflow logs
router.get("/", requireAuth, async (_req, res) => {
  try {
    const logs = await WorkflowLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notifications = logs.map((log, i) => {
      let type: string;
      let title: string;
      let body: string;

      if (log.status === "waiting_approval") {
        type = "approval_required";
        title = "Human Approval Required";
        body = "A workflow is paused and waiting for your review.";
      } else if (log.status === "success" && log.agentName === "Email Notification") {
        type = "workflow_completed";
        title = "Workflow Completed";
        body = log.outputSummary || "AI pipeline finished processing.";
      } else if (log.status === "success" && log.agentName === "Shortlisting") {
        const summary = log.outputSummary || "";
        type = summary.includes("shortlisted") ? "shortlisted" : "rejected";
        title = summary.includes("shortlisted") ? "Candidate Shortlisted" : "Candidate Rejected";
        body = summary || "Shortlisting decision made.";
      } else if (log.status === "failed") {
        type = "rejected";
        title = "Pipeline Step Failed";
        body = log.error || "An agent step encountered an error.";
      } else {
        type = "workflow_completed";
        title = log.agentName + " Completed";
        body = log.outputSummary || "Step completed successfully.";
      }

      return {
        id: String(log._id || i),
        type,
        title,
        body,
        read: false,
        createdAt: log.createdAt,
      };
    });

    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read — acknowledge (stateless, returns 200)
router.post("/:id/read", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
