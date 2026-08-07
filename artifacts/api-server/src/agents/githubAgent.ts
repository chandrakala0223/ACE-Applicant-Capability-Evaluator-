import { callLLMJson } from "../lib/llm";
import { GitHubReport } from "../models/GitHubReport";
import { logger } from "../lib/logger";
import type { Types } from "mongoose";

export interface GitHubAgentOutput {
  github_score: number;
  strengths: string[];
  weaknesses: string[];
  languages: string[];
  topRepositories: Array<{ name: string; description?: string; language?: string; stars: number; complexity: string }>;
  commitActivity: string;
  readmeQuality: string;
  openSourceContributions: string;
  dockerCicdUsage: boolean;
  confidence: number;
  explanation: string;
  evidence: string[];
  supportingSkills: string[];
  missingSkills: string[];
  reasoning: string;
  referencedReports: string[];
}

async function fetchGithubProfile(username: string): Promise<Record<string, unknown>> {
  try {
    // Fetch user profile
    const headers = { "User-Agent": "TalentOS-AI/1.0", Accept: "application/vnd.github.v3+json" };
    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    const user = userRes.ok ? await userRes.json() : { error: `Failed to fetch user: ${userRes.status}` };

    // Fetch repositories (up to 50 recent) with stats and topics
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=50`,
      { headers },
    );
    const repos = reposRes.ok ? ((await reposRes.json()) as Array<Record<string, unknown>>) : [];

    // For each repo, fetch languages and topics as needed (best-effort, limited)
    const topRepos = [] as Array<Record<string, unknown>>;
    for (const r of repos.slice(0, 12)) {
      const owner = (r.owner as any)?.login || username;
      const name = r.name;
      const repoMeta: Record<string, unknown> = {
        name,
        description: r.description || "",
        language: r.language || "",
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        size: r.size || 0,
        updated_at: r.updated_at || null,
        archived: r.archived || false,
      };

      try {
        const langRes = await fetch(`https://api.github.com/repos/${owner}/${name}/languages`, { headers });
        repoMeta.languages = langRes.ok ? await langRes.json() : {};
      } catch (e) {
        repoMeta.languages = {};
      }

      try {
        const topicsRes = await fetch(`https://api.github.com/repos/${owner}/${name}/topics`, {
          headers: { ...headers, Accept: "application/vnd.github.mercy-preview+json" },
        });
        const topicsJson = (topicsRes.ok ? await topicsRes.json() : {}) as any;
        repoMeta.topics = topicsJson.names || topicsJson.topics || [];
      } catch (e) {
        repoMeta.topics = [];
      }

      topRepos.push(repoMeta);
    }

    // Fetch contribution summary (best-effort via events or user data)
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, { headers });
    const events = eventsRes.ok ? await eventsRes.json() : [];

    return { username, user, repos: topRepos, rawRepos: repos.slice(0, 50), events };
  } catch (err) {
    logger.warn({ err, username }, "GitHub API fetch failed");
    return { username, error: "Failed to fetch" };
  }
}

export async function runGithubAgent(
  candidateId: Types.ObjectId | string,
  githubUrl: string,
): Promise<GitHubAgentOutput | null> {
  if (!githubUrl) return null;

  const username = extractGithubUsername(githubUrl);
  if (!username) return null;

  const githubData = await fetchGithubProfile(username);

  const systemPrompt = `You are an expert engineering talent assessor specializing in GitHub profile analysis.
Analyze the GitHub data and return a comprehensive JSON assessment with all required fields.
Score from 0-100 based on: repository quality, languages diversity, commit patterns, open source contributions, project complexity, DevOps tooling.
Be honest and evidence-based.`;

  const userPrompt = `Analyze this GitHub profile and return JSON:
{
  "github_score": 0-100,
  "strengths": ["list of specific strengths"],
  "weaknesses": ["list of areas for improvement"],
  "languages": ["programming languages used"],
  "topRepositories": [{"name":"","description":"","language":"","stars":0,"complexity":"low|medium|high"}],
  "commitActivity": "description of commit patterns",
  "readmeQuality": "assessment of README quality",
  "openSourceContributions": "description of OSS contributions",
  "dockerCicdUsage": true/false,
  "confidence": 0-100,
  "explanation": "detailed explanation of the score",
  "evidence": ["specific repos/commits/stats that support assessment"],
  "supportingSkills": ["skills demonstrated"],
  "missingSkills": ["skills not evident"],
  "reasoning": "step-by-step reasoning trail",
  "referencedReports": []
}

GitHub Data:
${JSON.stringify(githubData).slice(0, 6000)}`;

  try {
    const result = await callLLMJson<GitHubAgentOutput>(systemPrompt, userPrompt);

    // Save to DB with the richer raw data and LLM report
    await GitHubReport.findOneAndUpdate(
      { candidateId },
      {
        candidateId,
        githubUrl,
        githubScore: result.github_score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        languages: result.languages,
        topRepositories: result.topRepositories,
        commitActivity: result.commitActivity,
        readmeQuality: result.readmeQuality,
        openSourceContributions: result.openSourceContributions,
        dockerCicdUsage: result.dockerCicdUsage,
        confidence: result.confidence,
        explanation: result.explanation,
        evidence: result.evidence,
        supportingSkills: result.supportingSkills,
        missingSkills: result.missingSkills,
        reasoning: result.reasoning,
        referencedReports: result.referencedReports,
        rawGithubData: githubData,
      },
      { upsert: true, new: true },
    );

    return {
      score: result.github_score || 0,
      confidence: result.confidence || 0,
      summary: result.explanation || "",
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      metadata: result,
    } as any;
  } catch (err) {
    logger.error({ err, candidateId, githubUrl }, "GitHub analysis failed");
    return {
      score: 0,
      confidence: 0,
      summary: "GitHub analysis failed",
      strengths: [],
      weaknesses: [],
      metadata: {},
    } as any;
  }
}

function extractGithubUsername(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.hostname === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[0] || null;
    }
  } catch {}
  // Try regex fallback
  const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
