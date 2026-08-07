import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import candidatesRouter from "./candidates";
import workflowsRouter from "./workflows";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";
import publicRouter from "./public";
import analyticsRouter from "./analytics";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/jobs", jobsRouter);
router.use("/candidates", candidatesRouter);
router.use("/workflows", workflowsRouter);
router.use("/chat", chatRouter);
router.use("/dashboard", dashboardRouter);
router.use("/public", publicRouter);
router.use("/analytics", analyticsRouter);
router.use("/notifications", notificationsRouter);

export default router;
