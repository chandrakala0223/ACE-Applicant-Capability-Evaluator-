import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Detailed service status for the Settings page
router.get("/healthz/status", async (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const mongoStatus =
    mongoState === 1 ? "connected" :
    mongoState === 2 ? "connecting" :
    "disconnected";

  // Best-effort Qdrant ping
  let qdrantStatus: "connected" | "degraded" = "degraded";
  const qdrantUrl = process.env["QDRANT_URL"];
  const qdrantKey = process.env["QDRANT_API_KEY"];
  if (qdrantUrl) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(`${qdrantUrl}/healthz`, {
        headers: qdrantKey ? { "api-key": qdrantKey } : {},
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (r.ok) qdrantStatus = "connected";
    } catch {
      // degraded — leave as-is
    }
  }

  res.json({
    api: "online",
    mongodb: mongoStatus,
    qdrant: qdrantStatus,
    groq: process.env["GROQ_API_KEY"] ? "configured" : "missing",
    openrouter: process.env["OPENROUTER_API_KEY"] ? "configured" : "missing",
    resend: process.env["RESEND_API_KEY"] ? "configured" : "optional",
  });
});

export default router;
