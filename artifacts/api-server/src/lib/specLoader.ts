import fs from "fs";
import path from "path";
import { logger } from "./logger";

// specs/ lives at the workspace root, two directories above artifacts/api-server/
const specsRoot = path.resolve(process.cwd(), "../../specs");
const cache: Record<string, unknown> = {};

export function loadSpec<T = Record<string, unknown>>(relativePath: string): T {
  const cached = cache[relativePath];
  if (cached) return cached as T;

  const fullPath = path.join(specsRoot, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Spec file not found: ${fullPath}`);
  }

  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = JSON.parse(raw) as T;
    cache[relativePath] = parsed;
    return parsed;
  } catch (err) {
    logger.error({ err, path: fullPath }, "Failed to load spec file");
    throw new Error(`Failed to load spec: ${relativePath}`);
  }
}

export function clearSpecCache(): void {
  Object.keys(cache).forEach((k) => delete cache[k]);
}

export function loadRetryPolicy(): {
  max_retries: number;
  retry_delay_ms: number;
  retryable_errors: string[];
  non_retryable_errors: string[];
} {
  return loadSpec("system/retry-policy.json");
}

export function loadWorkflowSpec(specId = "default-hiring-workflow"): {
  workflow: string[];
} {
  return loadSpec(`workflow/${specId}.json`);
}

export function loadShortlistingThresholds(): {
  shortlist: number;
  hold_min: number;
  hold_max: number;
  reject_below: number;
} {
  return loadSpec("evaluation/shortlisting-thresholds.json");
}

export function loadHiringSpec(role: string): Record<string, unknown> {
  const slug = role.toLowerCase().replace(/\s+/g, "-");
  try {
    return loadSpec(`hiring/${slug}.json`);
  } catch {
    return loadSpec("hiring/frontend-developer.json");
  }
}
