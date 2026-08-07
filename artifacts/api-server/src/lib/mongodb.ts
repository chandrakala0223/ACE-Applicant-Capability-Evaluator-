import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

// Register all schemas/models on startup to prevent MissingSchemaError
import { User } from "../models/User";
import { Job } from "../models/Job";
import { Candidate } from "../models/Candidate";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { GitHubReport } from "../models/GitHubReport";
import { LinkedInReport } from "../models/LinkedInReport";
import { IntelligenceReport } from "../models/IntelligenceReport";
import { RoleRecommendation } from "../models/RoleRecommendation";
import { ComparisonResult } from "../models/ComparisonResult";
import { ChatMessage } from "../models/ChatHistory";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  const options = {
    dbName: "talentos",
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    tls: true,
    tlsAllowInvalidCertificates: false,
  };

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      logger.info(`Connecting to MongoDB... (Attempt ${attempt}/${maxRetries})`);
      await mongoose.connect(uri, options);
      isConnected = true;
      logger.info("MongoDB Connected");

      // Auto-create collections if they don't exist
      await ensureCollectionsExist();

      // Seed recruiter accounts automatically if they are missing
      await ensureRecruitersSeeded();

      return;
    } catch (err) {
      logger.error({ err, attempt }, `MongoDB connection attempt ${attempt} failed.`);
      if (attempt >= maxRetries) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("auth") || errMsg.includes("Authentication")) {
          throw new Error("MongoDB connection failed: Authentication failed (bad auth). Please verify the database username and password inside your MONGODB_URI in .env.");
        } else if (errMsg.includes("timeout") || errMsg.includes("Selection timeout")) {
          throw new Error("MongoDB connection failed: Connection timeout. Please verify network access (ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access).");
        }
        throw new Error(`MongoDB connection failed after ${maxRetries} attempts. Error: ${errMsg}`);
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function ensureCollectionsExist() {
  const models = [
    User, Job, Candidate, Workflow, WorkflowLog,
    GitHubReport, LinkedInReport, IntelligenceReport,
    RoleRecommendation, ComparisonResult, ChatMessage
  ];
  for (const model of models) {
    try {
      await model.createCollection();
    } catch (err) {
      logger.error({ err, modelName: model.modelName }, `Failed to ensure collection for model ${model.modelName}`);
    }
  }
}

async function ensureRecruitersSeeded() {
  try {
    const recruiters = [
      { name: "E Chandrakala", email: "chandrakala03455@gmail.com", password: "Chotu@2328", role: "recruiter" },
      { name: "G. Lekhaj", email: "lekhaj222@gmail.com", password: "Lekhaj@28", role: "recruiter" },
      { name: "J. Suhan", email: "bunnyjangiti165@gmail.com", password: "Suhan@11", role: "recruiter" }
    ];
    for (const r of recruiters) {
      const exists = await User.findOne({ email: r.email.toLowerCase() });
      if (exists) {
        const valid = await exists.comparePassword(r.password);
        if (!valid) {
          logger.warn({ email: r.email }, "Recruiter password invalid (possibly double-hashed). Correcting...");
          // Use raw updateOne to bypass Mongoose pre-save hook — we provide the final hash
          const hashed = await bcrypt.hash(r.password, 12);
          await User.collection.updateOne(
            { _id: exists._id },
            { $set: { password: hashed } }
          );
          logger.info({ email: r.email }, "Recruiter password corrected successfully");
        } else {
          logger.info({ email: r.email }, "Recruiter password verified OK");
        }
        continue;
      }

      // Insert directly to bypass pre-save hook — we provide the final hash
      const hashed = await bcrypt.hash(r.password, 12);
      await User.collection.insertOne({
        name: r.name,
        email: r.email.toLowerCase(),
        password: hashed,
        role: r.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      logger.info({ email: r.email }, "Recruiter account seeded");
    }
  } catch (err) {
    logger.error({ err }, "Error running auto-seed logic");
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error({ err }, "MongoDB connection error");
});

export { mongoose };
