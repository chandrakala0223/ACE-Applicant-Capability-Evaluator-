const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("talentos_token");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json() as { error?: string };
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Public (no auth)
async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json() as { error?: string };
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => apiFetch<User>("/auth/me"),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Job[]>(`/jobs${q ? `?${q}` : ""}`);
  },
  get: (jobId: string) => apiFetch<Job>(`/jobs/${jobId}`),
  create: (data: Partial<Job>) =>
    apiFetch<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
  update: (jobId: string, data: Partial<Job>) =>
    apiFetch<Job>(`/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (jobId: string) =>
    apiFetch<void>(`/jobs/${jobId}`, { method: "DELETE" }),
  duplicate: (jobId: string) =>
    apiFetch<Job>(`/jobs/${jobId}/duplicate`, { method: "POST" }),
  publish: (jobId: string) =>
    apiFetch<Job>(`/jobs/${jobId}/publish`, { method: "POST" }),
  close: (jobId: string) =>
    apiFetch<Job>(`/jobs/${jobId}/close`, { method: "POST" }),
  ranked: (jobId: string) => apiFetch<Candidate[]>(`/jobs/${jobId}/candidates/ranked`),
  pipeline: (jobId: string) => apiFetch<PipelineData>(`/jobs/${jobId}/pipeline`),
};

// ─── Candidates ───────────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params?: { jobId?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Candidate[]>(`/candidates${q ? `?${q}` : ""}`);
  },
  get: (candidateId: string) => apiFetch<Candidate>(`/candidates/${candidateId}`),
  upload: (formData: FormData) =>
    apiFetch<Candidate & { workflowId: string }>("/candidates/upload", {
      method: "POST",
      body: formData,
    }),
  github: (candidateId: string) => apiFetch<GitHubReport>(`/candidates/${candidateId}/github`),
  linkedin: (candidateId: string) => apiFetch<LinkedInReport>(`/candidates/${candidateId}/linkedin`),
  roles: (candidateId: string) => apiFetch<RoleRecommendation>(`/candidates/${candidateId}/roles`),
  intelligence: (candidateId: string) => apiFetch<IntelligenceReport>(`/candidates/${candidateId}/intelligence`),
  compare: (jobId: string, candidateIds: string[]) =>
    apiFetch<ComparisonResult>("/candidates/compare", {
      method: "POST",
      body: JSON.stringify({ jobId, candidateIds }),
    }),
};

// ─── Workflows ────────────────────────────────────────────────────────────────
export const workflowsApi = {
  list: (params?: { status?: string; jobId?: string; candidateId?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Workflow[]>(`/workflows${q ? `?${q}` : ""}`);
  },
  get: (workflowId: string) => apiFetch<WorkflowDetail>(`/workflows/${workflowId}`),
  start: (candidateId: string, jobId: string) =>
    apiFetch<Workflow>("/workflows/start", {
      method: "POST",
      body: JSON.stringify({ candidateId, jobId }),
    }),
  approve: (workflowId: string, approved: boolean, notes?: string) =>
    apiFetch<Workflow>(`/workflows/${workflowId}/approve`, {
      method: "POST",
      body: JSON.stringify({ approved, notes }),
    }),
  retry: (workflowId: string) =>
    apiFetch<Workflow>(`/workflows/${workflowId}/retry`, { method: "POST" }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => apiFetch<DashboardStats>("/dashboard/stats"),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (query: string) =>
    apiFetch<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ query }) }),
  history: (recruiterId: string) => apiFetch<ChatMessage[]>(`/chat/${recruiterId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: () => apiFetch<AnalyticsData>("/analytics"),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => apiFetch<Notification[]>("/notifications"),
  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: "POST" }),
};

// ─── Public (no auth) ─────────────────────────────────────────────────────────
export const publicApi = {
  listJobs: () => publicFetch<PublicJob[]>("/public/jobs"),
  getJob: (jobId: string) => publicFetch<PublicJob>(`/public/jobs/${jobId}`),
  apply: (formData: FormData) =>
    publicFetch<{ success: boolean; candidateId: string; workflowId: string; message: string }>(
      "/public/apply",
      { method: "POST", body: formData },
    ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
}

export interface Job {
  id: string;
  _id?: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
  status: string;
  workflowSpecId: string;
  candidateCount?: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  resumeUrl?: string;
  parsedResume?: ParsedResume;
  matchScore?: number;
  overallScore?: number;
  rank?: number;
  jobTitle?: string;
  status: "pending" | "shortlisted" | "hold" | "rejected" | "approved";
  workflowId?: string;
  workflow?: Workflow;
  createdAt: string;
  githubScore?: number;
  resumeScore?: number;
}

export interface ParsedProject {
  name?: string;
  description?: string;
  link?: string;
  technologies?: string[];
  role?: string;
}

export interface ParsedResume {
  name?: string;
  skills?: string[];
  experience?: number;
  education?: string;
  projects?: Array<string | ParsedProject>;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string;
  codeforcesUrl?: string;
  hackerrankUrl?: string;
  resumeSummary?: string;
}

export interface Workflow {
  id: string;
  _id?: string;
  candidateId: string | { name: string; email: string; status: string };
  jobId: string | { title: string };
  currentState: string;
  status: "running" | "completed" | "paused" | "failed";
  checkpoint?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowLog {
  id: string;
  agentName: string;
  status: string;
  outputSummary?: string;
  executionTimeMs?: number;
  retryCount?: number;
  error?: string;
  createdAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    status: string;
    confidence?: number;
    outputSummary?: string;
    executionTimeMs?: number;
    retryCount?: number;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface WorkflowDetail extends Workflow {
  logs: WorkflowLog[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface GitHubReport {
  id: string;
  githubScore: number;
  strengths: string[];
  weaknesses: string[];
  languages: string[];
  topRepositories: Array<{
    name: string;
    description?: string;
    language?: string;
    stars: number;
    complexity: string;
  }>;
  commitActivity: string;
  confidence: number;
  explanation: string;
}

export interface LinkedInReport {
  id: string;
  linkedinScore: number;
  yearsOfExperience: number;
  careerTrajectory: string;
  education: string;
  confidence: number;
  explanation: string;
}

export interface RoleRecommendation {
  id: string;
  recommendedRoles: Array<{
    roleTitle: string;
    jobId: string;
    matchScore: number;
    reasoning: string;
  }>;
  confidence: number;
}

export interface IntelligenceReport {
  id: string;
  matchScore: number;
  hiringRecommendation: string;
  confidence: number;
  supportingSkills: string[];
  missingSkills: string[];
  rankingPosition?: number;
  explanation?: string;
  reasoning: string;
  evidence: string[];
  referencedReports: string[];
}

export interface ComparisonResult {
  id: string;
  candidates: Array<{
    candidateId: string;
    name: string;
    matchScore?: number;
    githubScore?: number;
    linkedinScore?: number;
    supportingSkills: string[];
    missingSkills: string[];
    hiringRecommendation?: string;
  }>;
  aiSummary: string;
}

export interface DashboardStats {
  totalJobs: number;
  totalCandidates: number;
  shortlisted: number;
  rejected: number;
  avgMatchScore: number;
  workflowStatus: { running: number; completed: number; paused: number; failed: number };
  talentRediscovery: Array<{
    candidateId: string;
    name: string;
    currentRoleScore: number;
    betterRoleTitle: string;
    betterRoleScore: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    candidateName: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PipelineData {
  counts: {
    total: number;
    pending: number;
    shortlisted: number;
    hold: number;
    rejected: number;
    approved: number;
  };
  workflows: Workflow[];
  logs: WorkflowLog[];
}

export interface ChatMessage {
  id: string;
  query: string;
  response: string;
  createdAt: string;
}

export interface ChatResponse {
  id: string;
  response: string;
  createdAt: string;
}

export interface AnalyticsData {
  hiringFunnel: {
    total: number;
    shortlisted: number;
    rejected: number;
    hold: number;
    approved: number;
  };
  avgMatchScore: number;
  avgConfidence: number;
  skillDistribution: Array<{ skill: string; count: number }>;
  experienceDistribution: Array<{ range: string; count: number }>;
  topJobs: Array<{ title: string; candidateCount: number; avgScore: number }>;
  hiringTrend: Array<{ date: string; applications: number; shortlisted: number }>;
}

export interface Notification {
  id: string;
  type: "workflow_completed" | "approval_required" | "shortlisted" | "rejected";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
  createdAt: string;
}
