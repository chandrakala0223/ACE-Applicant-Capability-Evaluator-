import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { candidatesApi, type ParsedProject } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, Github, Linkedin, Globe, Code2, Brain, Star,
  GitBranch, FileText, ExternalLink, Lightbulb, Target, Trophy,
  CheckCircle, AlertCircle, BookOpen, Zap, BarChart3, Shield,
  TrendingUp, Award, Download,
} from "lucide-react";

export default function CandidateDetail() {
  const [, params] = useRoute("/candidates/:id");
  const candidateId = params?.id ?? "";

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => candidatesApi.get(candidateId),
    enabled: !!candidateId,
  });

  const { data: github } = useQuery({
    queryKey: ["candidate-github", candidateId],
    queryFn: () => candidatesApi.github(candidateId),
    enabled: !!candidateId,
    retry: false,
  });

  const { data: linkedin } = useQuery({
    queryKey: ["candidate-linkedin", candidateId],
    queryFn: () => candidatesApi.linkedin(candidateId),
    enabled: !!candidateId,
    retry: false,
  });

  const { data: intelligence } = useQuery({
    queryKey: ["candidate-intelligence", candidateId],
    queryFn: () => candidatesApi.intelligence(candidateId),
    enabled: !!candidateId,
    retry: false,
  });

  const { data: roles } = useQuery({
    queryKey: ["candidate-roles", candidateId],
    queryFn: () => candidatesApi.roles(candidateId),
    enabled: !!candidateId,
    retry: false,
  });

  if (isLoading) return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
  if (!candidate) return (
    <div className="p-8 text-slate-400 text-center py-20">
      <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Candidate not found</p>
    </div>
  );

  const pr = candidate.parsedResume;
  const initials = candidate.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const workflowId = candidate.workflow && typeof candidate.workflow === "object" && "id" in candidate.workflow
    ? (candidate.workflow as { id: string }).id
    : candidate.workflowId;
  const referencedReports = intelligence?.referencedReports ?? [];

  const overallScore = candidate.overallScore != null && candidate.overallScore > 0
    ? candidate.overallScore
    : (candidate.matchScore ?? 0);

  const scoreColor = overallScore >= 80
    ? "from-emerald-500 to-teal-500"
    : overallScore >= 60
    ? "from-blue-500 to-indigo-500"
    : "from-amber-500 to-orange-500";

  const renderProject = (project: string | ParsedProject) => {
    if (typeof project === "string") return project;
    const title = project.name?.trim();
    const description = project.description?.trim();
    const link = project.link?.trim();
    const technologies = project.technologies?.filter(Boolean).join(", ");
    const role = project.role?.trim();
    return (
      <div className="space-y-1">
        {title && <div className="font-semibold text-slate-900 dark:text-white">{title}</div>}
        {description && <div className="text-sm text-slate-600 dark:text-slate-400">{description}</div>}
        {(technologies || role || link) && (
          <div className="text-xs text-slate-500 space-y-0.5">
            {role && <div>Role: {role}</div>}
            {technologies && <div>Tech: {technologies}</div>}
            {link && (
              <div>
                Link: <a href={link} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{link}</a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const interviewAreas = intelligence ? [
    ...(intelligence.supportingSkills ?? []).map((s: string) => ({
      area: s,
      type: "strength" as const,
      tip: `Ask about real-world experience and impact with ${s}.`,
    })),
    ...(intelligence.missingSkills ?? []).slice(0, 4).map((s: string) => ({
      area: s,
      type: "gap" as const,
      tip: `Probe willingness and ability to learn ${s} on the job.`,
    })),
    ...(intelligence.evidence ?? []).slice(0, 3).map((e: string) => ({
      area: "Evidence",
      type: "evidence" as const,
      tip: e,
    })),
  ] : [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 no-underline transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Candidates
      </Link>

      {/* Hero Header */}
      <div className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />
        <div className="flex items-start gap-5 relative">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreColor} flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate.name}</h1>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {roles?.recommendedRoles?.[0]?.roleTitle || (candidate as any).jobTitle || "Candidate"}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{candidate.email}{candidate.phone && ` · ${candidate.phone}`}</p>

            {/* Links */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {pr?.githubUrl && (
                <a href={pr.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  <Github className="w-3.5 h-3.5" />GitHub
                </a>
              )}
              {pr?.linkedinUrl && (
                <a href={pr.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  <Linkedin className="w-3.5 h-3.5" />LinkedIn
                </a>
              )}
              {pr?.portfolioUrl && (
                <a href={pr.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  <Globe className="w-3.5 h-3.5" />Portfolio
                </a>
              )}
              {workflowId && (
                <Link
                  href={`/workflows/${workflowId}`}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 font-medium no-underline transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />View AI Pipeline
                </Link>
              )}
            </div>
          </div>

          {/* AI Score Orb */}
          <div className="shrink-0 text-center">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreColor} flex flex-col items-center justify-center shadow-lg`}>
              <span className="text-2xl font-black text-white leading-none">{overallScore}</span>
              <span className="text-[10px] text-white/80 font-medium mt-0.5">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Overall AI Score</p>
          </div>
        </div>

        {/* Metric Pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {((candidate as any).rank != null || intelligence?.rankingPosition != null) && (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800">
              <Trophy className="w-3.5 h-3.5" />
              Rank #{(candidate as any).rank || intelligence?.rankingPosition}
            </div>
          )}
          {intelligence?.confidence != null && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <Shield className="w-3.5 h-3.5" />
              AI Confidence: {intelligence.confidence}%
            </div>
          )}
          {github?.githubScore != null && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <Github className="w-3.5 h-3.5" />
              GitHub: {github.githubScore}/100
            </div>
          )}
          {pr?.experience != null && String(pr.experience) !== "?" && (
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800">
              <TrendingUp className="w-3.5 h-3.5" />
              {pr.experience} {Number(pr.experience) === 1 ? "year" : "years"} exp
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1 glass-card p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg text-xs font-medium">Profile</TabsTrigger>
          <TabsTrigger value="resume" className="rounded-lg text-xs font-medium">Resume</TabsTrigger>
          <TabsTrigger value="evaluation" className="rounded-lg text-xs font-medium">AI Evaluation</TabsTrigger>
          <TabsTrigger value="github" className="rounded-lg text-xs font-medium">GitHub</TabsTrigger>
          <TabsTrigger value="linkedin" className="rounded-lg text-xs font-medium">LinkedIn</TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-lg text-xs font-medium">Portfolio</TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg text-xs font-medium">Role Matches</TabsTrigger>
          <TabsTrigger value="interview" className="rounded-lg text-xs font-medium">Interview Prep</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="glass-card rounded-2xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Zap className="w-4 h-4 text-indigo-500" />Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pr?.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {pr.skills.map((s: string) => (
                      <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium border border-indigo-100 dark:border-indigo-800">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">No skills extracted yet — run the AI pipeline.</p>}
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />Experience & Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Experience</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {pr?.experience != null && String(pr.experience) !== "?"
                      ? `${pr.experience} ${Number(pr.experience) === 1 ? "year" : "years"}`
                      : "Not Available"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Education</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right max-w-[60%]">{pr?.education || "Not specified"}</span>
                </div>
              </CardContent>
            </Card>

            {pr?.projects && pr.projects.length > 0 && (
              <Card className="md:col-span-2 glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Star className="w-4 h-4 text-indigo-500" />Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {pr.projects.map((project: string | ParsedProject, i: number) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                        {renderProject(project)}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(pr?.leetcodeUrl || pr?.codeforcesUrl || pr?.hackerrankUrl) && (
              <Card className="md:col-span-2 glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Code2 className="w-4 h-4 text-indigo-500" />Coding Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                  {pr.leetcodeUrl && (
                    <a href={pr.leetcodeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                      LeetCode <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {pr.codeforcesUrl && (
                    <a href={pr.codeforcesUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                      Codeforces <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {pr.hackerrankUrl && (
                    <a href={pr.hackerrankUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                      HackerRank <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Resume ── */}
        <TabsContent value="resume">
          <div className="space-y-5">
            {candidate.resumeUrl ? (
              <>
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FileText className="w-4 h-4 text-indigo-500" />Resume Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <a
                        href={`/api/candidates/${candidate.id}/resume`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" /> Open Resume
                      </a>
                      <a
                        href={`/api/candidates/${candidate.id}/resume?download=true`}
                        download
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download PDF
                      </a>
                    </div>
                    <iframe
                      src={`/api/candidates/${candidate.id}/resume`}
                      title="Resume"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
                      style={{ height: "650px" }}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="glass-card rounded-2xl border-0">
                <CardContent className="py-20 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No resume uploaded</p>
                  <p className="text-slate-400 text-sm mt-1">The candidate has not submitted a resume yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── AI Evaluation ── */}
        <TabsContent value="evaluation">
          {intelligence ? (
            <div className="space-y-5">
              {/* Score Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <div className={`text-3xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
                      {overallScore}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Overall AI Score</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">out of 100</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-700 dark:text-slate-200">{intelligence.confidence}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">AI Confidence</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">evaluation certainty</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                      {roles?.recommendedRoles?.[0]?.roleTitle || "—"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Recommended Role</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">AI best-fit match</p>
                  </CardContent>
                </Card>
              </div>

              {intelligence.reasoning && (
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Brain className="w-4 h-4 text-indigo-500" />Evaluation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{intelligence.reasoning}</p>
                  </CardContent>
                </Card>
              )}

              {intelligence.evidence?.length > 0 && (
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />Supporting Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {intelligence.evidence.map((e: string, i: number) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <Award className="w-4 h-4" />Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {intelligence.supportingSkills.map((s: string) => (
                        <span key={s} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">{s}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />Skill Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {intelligence.missingSkills.map((s: string) => (
                        <span key={s} className="text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">{s}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recruiter note */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-400">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <p>The AI provides evaluation data only. All hiring decisions remain with the recruiter.</p>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400 py-8 text-center">AI evaluation report not available. Run the AI pipeline first.</p>}
        </TabsContent>

        {/* ── GitHub ── */}
        <TabsContent value="github">
          {github ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{github.githubScore}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">GitHub Score</p>
                    <p className="text-[10px] text-slate-400">out of 100</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{github.confidence}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Confidence</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Languages</p>
                    <div className="flex flex-wrap gap-1">
                      {github.languages.slice(0, 6).map((l: string) => (
                        <span key={l} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{l}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{github.explanation}</p>
                </CardContent>
              </Card>
              {github.topRepositories?.length > 0 && (
                <Card className="glass-card rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Top Repositories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {github.topRepositories.map((repo: { name: string; description?: string; language?: string; stars: number; complexity: string }, i: number) => (
                        <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <Github className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{repo.name}</p>
                            {repo.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{repo.description}</p>}
                            <div className="flex gap-2 mt-1.5">
                              {repo.language && <span className="text-xs text-slate-400">{repo.language}</span>}
                              <span className="text-xs text-slate-400">⭐ {repo.stars}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${repo.complexity === "high" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : repo.complexity === "medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>{repo.complexity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : <p className="text-sm text-slate-400 py-8 text-center">GitHub report not available. Run the AI pipeline first.</p>}
        </TabsContent>

        {/* ── LinkedIn ── */}
        <TabsContent value="linkedin">
          {linkedin ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{linkedin.linkedinScore}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">LinkedIn Score</p>
                    <p className="text-[10px] text-slate-400">out of 100</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{linkedin.yearsOfExperience}y</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Experience</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{linkedin.confidence}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Confidence</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Profile Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{linkedin.explanation}</p>
                  {linkedin.careerTrajectory && (
                    <div className="flex gap-2 text-sm mb-2">
                      <span className="text-slate-500 shrink-0 font-medium">Career:</span>
                      <span className="text-slate-700 dark:text-slate-300">{linkedin.careerTrajectory}</span>
                    </div>
                  )}
                  {linkedin.education && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-slate-500 shrink-0 font-medium">Education:</span>
                      <span className="text-slate-700 dark:text-slate-300">{linkedin.education}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : <p className="text-sm text-slate-400 py-8 text-center">LinkedIn report not available. Run the AI pipeline first.</p>}
        </TabsContent>

        {/* ── Portfolio ── */}
        <TabsContent value="portfolio">
          <div className="space-y-5">
            {pr?.portfolioUrl ? (
              <Card className="glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Globe className="w-4 h-4 text-indigo-500" />Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={pr.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-md mb-4"
                  >
                    <ExternalLink className="w-4 h-4" /> View Portfolio
                  </a>
                  <iframe
                    src={pr.portfolioUrl}
                    title="Portfolio"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
                    style={{ height: "500px" }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card rounded-2xl border-0">
                <CardContent className="py-20 text-center">
                  <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No portfolio URL provided</p>
                  <p className="text-slate-400 text-sm mt-1">The candidate did not include a portfolio link.</p>
                </CardContent>
              </Card>
            )}
            {referencedReports.length > 0 && (
              <Card className="glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 dark:text-slate-400">AI Analysis References</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {referencedReports.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />{r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Role Matches ── */}
        <TabsContent value="roles">
          {roles?.recommendedRoles?.length ? (
            <div className="space-y-3">
              {roles.recommendedRoles.map((r: { roleTitle: string; reasoning: string; matchScore: number }, i: number) => (
                <Card key={i} className="glass-card rounded-2xl border-0">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{r.roleTitle}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{r.matchScore}%</span>
                        <p className="text-xs text-slate-400">AI match</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 py-8 text-center">No role recommendations yet. Run the AI pipeline first.</p>}
        </TabsContent>

        {/* ── Interview Prep ── */}
        <TabsContent value="interview">
          {intelligence ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-400">
                <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p>Interview areas generated from AI evaluation — covering strengths, skill gaps, and pipeline evidence.</p>
              </div>
              {interviewAreas.length > 0 ? (
                <div className="space-y-3">
                  {interviewAreas.map((area, i) => (
                    <Card key={i} className="glass-card rounded-2xl border-0">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          {area.type === "strength" && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                          {area.type === "gap" && <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
                          {area.type === "evidence" && <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
                          <div className="flex-1">
                            {area.type !== "evidence" && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900 dark:text-white text-sm">{area.area}</span>
                                <Badge variant="outline" className={`text-xs ${area.type === "strength" ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400"}`}>
                                  {area.type === "strength" ? "Strength" : "Gap"}
                                </Badge>
                              </div>
                            )}
                            <p className="text-sm text-slate-600 dark:text-slate-400">{area.tip}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="glass-card rounded-2xl border-0">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-slate-400">No interview areas extracted. Run the full AI pipeline first.</p>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card rounded-2xl border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Brain className="w-4 h-4 text-indigo-500" />AI Evaluation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {intelligence.explanation || intelligence.reasoning}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass-card rounded-2xl border-0">
              <CardContent className="py-20 text-center">
                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Intelligence report not available</p>
                <p className="text-slate-400 text-sm mt-1">Run the AI pipeline to generate interview preparation areas.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
