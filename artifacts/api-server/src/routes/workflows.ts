import { Router } from "express";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { startWorkflow, resumeWorkflow, executeWorkflow } from "../workflows/orchestrator";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/workflows
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, jobId, candidateId } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter["status"] = status;
    if (jobId) filter["jobId"] = jobId;
    if (candidateId) filter["candidateId"] = candidateId;

    const workflows = await Workflow.find(filter)
      .sort({ createdAt: -1 })
      .populate("candidateId", "name email status")
      .populate("jobId", "title")
      .lean();

    res.json(workflows.map((w) => ({ ...w, id: String(w._id) })));
  } catch {
    res.status(500).json({ error: "Failed to list workflows" });
  }
});

// POST /api/workflows/start
router.post("/start", requireAuth, async (req, res) => {
  try {
    const body = req.body as { candidateId?: string; jobId?: string; workflowSpecId?: string };
    if (!body.candidateId || !body.jobId) {
      res.status(400).json({ error: "candidateId and jobId are required" });
      return;
    }
    const workflowId = await startWorkflow(body.candidateId, body.jobId, body.workflowSpecId);
    const workflow = await Workflow.findById(workflowId).lean();
    res.status(201).json({ ...workflow, id: String(workflow?._id) });
  } catch {
    res.status(500).json({ error: "Failed to start workflow" });
  }
});

// POST /api/workflows/:workflowId/retry
router.post("/:workflowId/retry", requireAuth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.workflowId);
    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }
    const specId =
      ((workflow.checkpoint as Record<string, unknown>)?.workflowSpecId as string) ||
      "default-hiring-workflow";

    const workflowId = String(req.params.workflowId);
    await Workflow.findByIdAndUpdate(workflowId, { status: "running" });
    void executeWorkflow(workflowId, specId);

    const updated = await Workflow.findById(workflowId).lean();
    res.json({ ...updated, id: String(updated?._id) });
  } catch {
    res.status(500).json({ error: "Failed to retry workflow" });
  }
});

// POST /api/workflows/:workflowId/approve
router.post("/:workflowId/approve", requireAuth, async (req, res) => {
  try {
    const body = req.body as { approved?: boolean; notes?: string };
    if (body.approved === undefined) {
      res.status(400).json({ error: "approved field is required" });
      return;
    }
    const workflowId = String(req.params.workflowId);
    await resumeWorkflow(workflowId, body.approved, body.notes);
    const updated = await Workflow.findById(workflowId).lean();
    res.json({ ...updated, id: String(updated?._id) });
  } catch {
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// GET /api/workflows/:workflowId
router.get("/:workflowId", requireAuth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.workflowId)
      .populate("candidateId", "name email status matchScore")
      .populate("jobId", "title")
      .lean();

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    const logs = await WorkflowLog.find({ workflowId: req.params.workflowId })
      .sort({ createdAt: 1 })
      .lean();

    // Build pipeline nodes for React Flow visualization
    const nodes = logs.map((log, i) => ({
      id: String(log._id),
      type: "agentNode",
      position: { x: 250, y: i * 120 },
      data: {
        label: String(log.agentName),
        status: log.status,
        confidence: log.confidence,
        outputSummary: log.outputSummary,
        executionTimeMs: log.executionTimeMs,
        retryCount: log.retryCount,
      },
    }));

    const edges = logs.slice(1).map((log, i) => ({
      id: `e${i}`,
      source: String(logs[i]._id),
      target: String(log._id),
      type: "smoothstep",
    }));

    res.json({
      ...workflow,
      id: String(workflow._id),
      logs: logs.map((l) => ({ ...l, id: String(l._id) })),
      nodes,
      edges,
    });
  } catch {
    res.status(404).json({ error: "Workflow not found" });
  }
});

export default router;
