/**
 * resumeParser.ts
 *
 * Step-by-step resume parsing with full diagnostic logging.
 *
 * pdf-parse@2 uses pdfjs-dist which exposes a PDFParse CLASS (not a plain
 * function). The polyfills (DOMMatrix etc.) MUST already be installed before
 * this module is imported — see src/lib/pdfPolyfills.ts & index.ts.
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { callLLMJson } from "../lib/llm";
import { logger } from "../lib/logger";

// createRequire is needed to CJS-require pdf-parse from an ESM module
const require = createRequire(import.meta.url);

/* ─────────────────────────────────────────────────────────────────────────────
   PDF TEXT EXTRACTION
   ───────────────────────────────────────────────────────────────────────────── */

async function extractTextFromPdf(filePath: string): Promise<string> {
  // ── Step 1: verify file exists ──────────────────────────────────────────────
  const exists = fs.existsSync(filePath);
  logger.info(
    { filePath, exists },
    "[RESUME-PARSER] Step 1 — file existence check",
  );

  if (!exists) {
    const err = new Error(
      `[RESUME-PARSER] CRITICAL: File not found at path: ${filePath}`,
    );
    logger.error({ filePath }, err.message);
    throw err;
  }

  // ── Step 2: check file size ─────────────────────────────────────────────────
  const stats = fs.statSync(filePath);
  logger.info(
    { filePath, sizeBytes: stats.size },
    "[RESUME-PARSER] Step 2 — file size",
  );

  if (stats.size === 0) {
    throw new Error(`[RESUME-PARSER] CRITICAL: File is empty (0 bytes): ${filePath}`);
  }

  // ── Step 3: load pdf-parse and extract PDFParse class ───────────────────────
  logger.info({ filePath }, "[RESUME-PARSER] Step 3 — loading pdf-parse module");

  // Polyfills must already be in place (see pdfPolyfills.ts + index.ts import order)
  let pdfParseModule: any;
  try {
    pdfParseModule = require("pdf-parse");
  } catch (loadErr) {
    logger.error({ err: (loadErr as Error).message, stack: (loadErr as Error).stack }, "[RESUME-PARSER] CRITICAL: Failed to require pdf-parse");
    throw loadErr;
  }

  // pdf-parse@2 exports: { PDFParse, AbortException, ... }
  const PDFParseClass: any =
    pdfParseModule?.PDFParse ??
    pdfParseModule?.default?.PDFParse ??
    // pdf-parse@1 compat: module itself is the function
    (typeof pdfParseModule === "function" ? pdfParseModule : null) ??
    (typeof pdfParseModule?.default === "function" ? pdfParseModule.default : null);

  logger.info(
    {
      moduleKeys: Object.keys(pdfParseModule ?? {}),
      PDFParseType: typeof PDFParseClass,
    },
    "[RESUME-PARSER] Step 3 — pdf-parse module loaded",
  );

  if (typeof PDFParseClass !== "function") {
    throw new Error(
      `[RESUME-PARSER] CRITICAL: pdf-parse module did not export a usable constructor. Module keys: ${Object.keys(pdfParseModule ?? {}).join(", ")}`,
    );
  }

  // ── Step 4: read file buffer ─────────────────────────────────────────────────
  logger.info({ filePath }, "[RESUME-PARSER] Step 4 — reading PDF buffer");
  const buffer = fs.readFileSync(filePath);

  // ── Step 5: parse PDF → text ─────────────────────────────────────────────────
  logger.info(
    { filePath, bufferLength: buffer.length },
    "[RESUME-PARSER] Step 5 — PDF extraction started",
  );

  let extractedText: string;
  try {
    // pdf-parse@2: new PDFParse({ data: buffer }).getText() → Promise<{ text }>
    const parser = new PDFParseClass({ data: buffer });
    const result = await parser.getText();

    if (!result || typeof result.text !== "string") {
      throw new Error(
        `[RESUME-PARSER] pdf-parse returned unexpected result shape: ${JSON.stringify(result).slice(0, 200)}`,
      );
    }
    extractedText = result.text;
  } catch (pdfErr) {
    logger.error(
      {
        err: (pdfErr as Error).message,
        stack: (pdfErr as Error).stack,
        filePath,
      },
      "[RESUME-PARSER] CRITICAL: PDF text extraction failed",
    );
    throw pdfErr;
  }

  // ── Step 6: validate extracted text ─────────────────────────────────────────
  logger.info(
    {
      filePath,
      textLength: extractedText.length,
      preview: extractedText.slice(0, 500),
    },
    "[RESUME-PARSER] Step 6 — PDF extraction complete",
  );

  if (extractedText.length < 100) {
    throw new Error(
      `[RESUME-PARSER] CRITICAL: Extracted text too short (${extractedText.length} chars). ` +
      `The PDF may be scanned/image-based or empty. Preview: "${extractedText.slice(0, 200)}"`,
    );
  }

  return extractedText;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PARSED RESUME INTERFACE
   ───────────────────────────────────────────────────────────────────────────── */

export interface ParsedResume {
  // Identity
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Core signals
  skills?: string[];
  experience?: number; // years
  education?: string;
  resumeSummary?: string;

  // Detailed sections
  workExperience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    responsibilities?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    link?: string;
    technologies?: string[];
    role?: string;
  }>;
  certifications?: string[];
  languages?: string[];
  achievements?: string[];

  // External profiles
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string;
  codeforcesUrl?: string;
  hackerrankUrl?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   LLM PARSING
   ───────────────────────────────────────────────────────────────────────────── */

async function parseResumeWithLLM(text: string, filePath: string): Promise<ParsedResume> {
  const systemPrompt = `You are an expert resume parser. Extract structured data from resume text and return ONLY valid JSON. Rules:
- Extract EVERY field that exists in the text — never omit present information.
- Never invent data. If a field is absent, omit it entirely (do not use null, "Unknown", or empty strings).
- For URLs: extract full URLs including https://. If only a path like "github.com/user" is given, prepend "https://".
- For skills: extract ALL technical skills, frameworks, languages, and tools mentioned anywhere in the resume.
- For experience (years): compute from work history dates if possible.
- Return ONLY the raw JSON object — no markdown fences, no explanation.`;

  const userPrompt = `Parse the following resume and return a JSON object with these fields (include only fields that are present):
name, email, phone, location,
skills (string[]), experience (number: years), education (string), resumeSummary (string),
workExperience (array: {company, title, startDate, endDate, description, responsibilities[]}),
projects (array: {name, description, link, technologies[], role}),
certifications (string[]), languages (string[]), achievements (string[]),
githubUrl, linkedinUrl, portfolioUrl, leetcodeUrl, codeforcesUrl, hackerrankUrl.

Resume text:
${text.slice(0, 15000)}`;

  // ── Step 7: log LLM request ──────────────────────────────────────────────────
  logger.info(
    {
      filePath,
      textLength: text.length,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    },
    "[RESUME-PARSER] Step 7 — sending to LLM",
  );

  let raw: string;
  try {
    // callLLMJson wraps callLLM which returns the raw string; we need the raw string
    // for logging, so we replicate the call here to capture it.
    const { callLLM } = await import("../lib/llm");
    raw = await callLLM(systemPrompt, userPrompt, true);
  } catch (llmErr) {
    logger.error(
      { err: (llmErr as Error).message, filePath },
      "[RESUME-PARSER] CRITICAL: LLM call failed",
    );
    throw llmErr;
  }

  // ── Step 8: log raw LLM response ────────────────────────────────────────────
  logger.info(
    { filePath, rawLength: raw.length, rawPreview: raw.slice(0, 1000) },
    "[RESUME-PARSER] Step 8 — raw LLM response received",
  );

  // ── Step 9: parse JSON ───────────────────────────────────────────────────────
  let parsed: ParsedResume;
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let jsonStr = cleaned;
    if (!jsonStr.startsWith("{")) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error(`No JSON object found in LLM response: ${cleaned.slice(0, 300)}`);
      }
      jsonStr = match[0];
    }

    parsed = JSON.parse(jsonStr) as ParsedResume;
  } catch (parseErr) {
    logger.error(
      {
        err: (parseErr as Error).message,
        rawResponse: raw.slice(0, 2000),
        filePath,
      },
      "[RESUME-PARSER] CRITICAL: JSON parse failed — logging full raw LLM response above",
    );
    throw new Error(`[RESUME-PARSER] JSON parse error: ${(parseErr as Error).message}. Raw: ${raw.slice(0, 500)}`);
  }

  // ── Step 10: log parsed result ───────────────────────────────────────────────
  logger.info(
    {
      filePath,
      parsedFields: Object.keys(parsed),
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      skillsCount: parsed.skills?.length ?? 0,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      githubUrl: parsed.githubUrl,
      linkedinUrl: parsed.linkedinUrl,
      portfolioUrl: parsed.portfolioUrl,
      leetcodeUrl: parsed.leetcodeUrl,
      workExperienceCount: parsed.workExperience?.length ?? 0,
      projectsCount: parsed.projects?.length ?? 0,
    },
    "[RESUME-PARSER] Step 10 — parsed JSON result",
  );

  return parsed;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN ENTRY POINT
   ───────────────────────────────────────────────────────────────────────────── */

export async function runResumeParser(resumeFilePath: string): Promise<ParsedResume & Record<string, unknown>> {
  logger.info({ resumeFilePath }, "[RESUME-PARSER] ====== RESUME PARSER STARTED ======");

  // ── Step 1-6: extract text from PDF ─────────────────────────────────────────
  const text = await extractTextFromPdf(resumeFilePath);

  // ── Step 7-10: LLM parsing ───────────────────────────────────────────────────
  const parsed = await parseResumeWithLLM(text, resumeFilePath);

  // Compute a simple resume score based on completeness
  const fieldScore = [
    parsed.name, parsed.email, parsed.phone, parsed.location,
    parsed.skills?.length, parsed.education, parsed.workExperience?.length,
    parsed.projects?.length, parsed.githubUrl, parsed.linkedinUrl,
  ].filter(Boolean).length;
  const score = Math.min(100, 40 + fieldScore * 6);

  // ── Step 11: return unified agent output ────────────────────────────────────
  const result = {
    score,
    confidence: 95,
    summary: parsed.resumeSummary || `${parsed.name ?? "Candidate"} — ${(parsed.skills ?? []).slice(0, 3).join(", ")}`,
    strengths: (parsed.skills ?? []).slice(0, 5),
    weaknesses: [],
    metadata: parsed,
  };

  logger.info(
    {
      resumeFilePath,
      score,
      name: parsed.name,
      email: parsed.email,
      skillsCount: parsed.skills?.length ?? 0,
    },
    "[RESUME-PARSER] ====== RESUME PARSER COMPLETE ======",
  );

  return result as any;
}
