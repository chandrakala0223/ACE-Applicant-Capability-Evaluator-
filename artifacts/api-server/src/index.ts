// ⚠ MUST be first: installs DOMMatrix/DOMPoint/Path2D/ImageData/window/navigator/document
// BEFORE pdf-parse (pdfjs-dist) is loaded by any subsequent import.
import "./lib/pdfPolyfills";

import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";
import { ensureCollections } from "./lib/qdrant";
import { verifyResendEmailKey } from "./agents/emailAgent";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  // Connect to MongoDB — best-effort so the server still starts if Atlas rejects the IP.
  // Routes that need the DB will return 503 until the connection is established.
  try {
    await connectMongoDB();
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed — server will start but database operations will be unavailable. Fix: whitelist 0.0.0.0/0 in MongoDB Atlas Network Access.");
  }

  // Verify Resend connection
  try {
    await verifyResendEmailKey();
  } catch (err) {
    logger.error({ err }, "Resend verification failed");
  }

  // Connect to Qdrant and ensure collections (best-effort — don't crash if unavailable)
  try {
    await ensureCollections();
  } catch (err) {
    logger.warn({ err }, "Qdrant initialization failed — vector search will be degraded");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "TalentOS API Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Server startup failed");
  process.exit(1);
});
