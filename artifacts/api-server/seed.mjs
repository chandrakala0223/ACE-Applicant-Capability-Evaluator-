#!/usr/bin/env node
/**
 * Talent OS — Recruiter Seed Script
 *
 * Usage:
 *   pnpm seed          (from workspace root)
 *   node seed.mjs      (from api-server directory, requires --env-file=../../.env)
 *
 * Safe to run multiple times — never creates duplicates.
 * Reads MONGODB_URI from .env automatically.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// ─── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  // Try ../../.env (from api-server/) or .env (from workspace root)
  const candidates = [
    resolve(__dirname, "../../.env"),
    resolve(__dirname, ".env"),
    resolve(process.cwd(), ".env"),
  ];

  for (const envPath of candidates) {
    try {
      const raw = readFileSync(envPath, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
      console.log(`✓ Loaded env from: ${envPath}`);
      return;
    } catch {
      // try next
    }
  }
  console.warn("⚠ No .env file found — relying on process.env");
}

// ─── Recruiter accounts to seed ───────────────────────────────────────────────
const RECRUITERS = [
  {
    name: "E Chandrakala",
    email: "chandrakala03455@gmail.com",
    password: "Chotu@2328",
    role: "recruiter",
  },
  {
    name: "G. Lekhaj",
    email: "lekhaj222@gmail.com",
    password: "Lekhaj@28",
    role: "recruiter",
  },
  {
    name: "J. Suhan",
    email: "bunnyjangiti165@gmail.com",
    password: "Suhan@11",
    role: "recruiter",
  },
];

// ─── Minimal User schema (avoids importing TS files) ─────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "recruiter", enum: ["recruiter", "admin"] },
  },
  { timestamps: true }
);

const User = mongoose.models["User"] || mongoose.model("User", userSchema);

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  loadEnv();

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    console.error("✗ MONGODB_URI is not set. Add it to your .env file.");
    process.exit(1);
  }

  console.log("\n🔌 Connecting to MongoDB...");
  await mongoose.connect(uri, {
    dbName: "talentos",
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    tls: true,
    tlsAllowInvalidCertificates: false,
  });
  console.log("✓ Connected to MongoDB\n");

  for (const recruiter of RECRUITERS) {
    const existing = await User.findOne({ email: recruiter.email.toLowerCase() });
    if (existing) {
      const valid = await bcrypt.compare(recruiter.password, existing.password);
      if (!valid) {
        console.log(`  ⚙  Resetting/Fixing Recruiter Password → ${recruiter.email}`);
        // Use updateOne to bypass Mongoose pre-save hook (which would hash again)
        const hashed = await bcrypt.hash(recruiter.password, 12);
        await User.collection.updateOne(
          { _id: existing._id },
          { $set: { password: hashed } }
        );
        console.log(`  ✓ Recruiter Password Fixed → ${recruiter.name}`);
      } else {
        console.log(`  ⚡ Recruiter Already Exists & Verified → ${recruiter.email}`);
      }
      continue;
    }

    // For new users: hash manually and insert directly to bypass pre-save hook
    const hashed = await bcrypt.hash(recruiter.password, 12);
    await User.collection.insertOne({
      name: recruiter.name,
      email: recruiter.email.toLowerCase(),
      password: hashed,
      role: recruiter.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✓ Recruiter Created → ${recruiter.name} (${recruiter.email})`);
  }

  console.log("\n✅ Seed Completed Successfully\n");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n✗ Seed failed:", err.message);
  process.exit(1);
});
