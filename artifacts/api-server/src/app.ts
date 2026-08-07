import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import mongoose from "mongoose";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";

const app: Express = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again later" },
  skip: (req) => req.path === "/api/health",
});
app.use(limiter);

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS
app.use(
  cors({
    origin: process.env["CORS_ORIGIN"] || true,
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files
const uploadDir = path.resolve(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Database connection check middleware — re-connect if disconnected between requests
app.use("/api", async (req, res, next) => {
  if (req.path === "/healthz" || req.path === "/healthz/status") {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    logger.warn("MongoDB not connected. Retrying connection...");
    try {
      await connectMongoDB();
      logger.info("MongoDB connection re-established");
    } catch (err) {
      logger.error({ err }, "MongoDB reconnect attempt failed");
      const message =
        err instanceof Error
          ? err.message
          : "MongoDB connection failed. Please check your MONGODB_URI and verify network access.";
      res.status(503).json({ error: message });
      return;
    }
  }
  next();
});

// Routes
app.use("/api", router);

export default app;
