import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { jobsApi, candidatesApi, type Job, type Candidate, type ComparisonResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, Loader2, RotateCcw, Brain, Trophy, Shield, Github, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-slate-400 text-sm">—</span>;
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "from-emerald-500 to-teal-500" : pct >= 50 ? "from-blue-500 to-indigo-500" : "from-amber-500 to-orange-500";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-lg font-black", pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400")}>
        {value}
      </span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CandidateComparison() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsApi.list(),
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates", selectedJobId],
    queryFn: () => candidatesApi.list({ jobId: selectedJobId }),
    enabled: !!selectedJobId,
  });

  const compare = useMutation({
    mutationFn: () => candidatesApi.compare(selectedJobId, selectedIds),
    onSuccess: (data) => setResult(data),
  });

  function toggleCandidate(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  function reset() {
    setResult(null);
    setSelectedIds([]);
  }

  if (jobsLoading) return (
    <div className="p-8 max-w-6xl mx-auto space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Intelligence Comparison</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Select 2–4 candidates from the same job for AI-powered side-by-side analysis</p>
          </div>
        </div>
      </div>

      {!result ? (
        <>
          {/* Job selector */}
          <div className="glass-card rounded-2xl p-5 mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Select Job Posting</label>
            <Select value={selectedJobId} onValueChange={(v) => { setSelectedJobId(v); setSelectedIds([]); }}>
              <SelectTrigger className="w-80 rounded-xl border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Choose a job posting..." />
              </SelectTrigger>
              <SelectContent>
                {(jobs ?? []).map((job: Job) => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Candidate grid */}
          {selectedJobId && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {candidates?.length ?? 0} candidates available
                  {selectedIds.length > 0 && (
                    <span className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400">
                      ({selectedIds.length} selected)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">Select 2 to 4 candidates to compare</p>
              </div>

              {candidatesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
              ) : candidates?.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No candidates for this job yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {(candidates ?? []).map((c: Candidate) => {
                    const selected = selectedIds.includes(c.id);
                    const disabled = !selected && selectedIds.length >= 4;
                    const score = c.overallScore ?? c.matchScore ?? 0;
                    const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={c.id}
                        onClick={() => !disabled && toggleCandidate(c.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative",
                          selected
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20"
                            : "border-slate-200 dark:border-slate-700 glass-card hover:border-indigo-300 dark:hover:border-indigo-700",
                          disabled && "opacity-40 cursor-not-allowed",
                        )}
                      >
                        {selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                            selected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            {initials}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">AI Score</span>
                          <span className={cn(
                            "text-sm font-black",
                            score >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                            score >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                          )}>
                            {score > 0 ? `${score}/100` : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={() => compare.mutate()}
                disabled={selectedIds.length < 2 || compare.isPending}
                className="min-w-48 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity rounded-xl font-semibold"
              >
                {compare.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Brain className="w-4 h-4 mr-2" /> Compare {selectedIds.length} Candidates</>
                )}
              </Button>

              {compare.isError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                  Comparison failed: {compare.error instanceof Error ? compare.error.message : "Unknown error"}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Results */
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Comparison Results</h2>
            <Button variant="outline" size="sm" onClick={reset} className="rounded-xl">
              <RotateCcw className="w-4 h-4 mr-2" />Compare Again
            </Button>
          </div>

          {/* Metrics Table */}
          <Card className="mb-6 overflow-auto glass-card rounded-2xl border-0">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                    <th className="text-left px-5 py-4 font-semibold text-slate-500 dark:text-slate-400 w-40 text-xs uppercase tracking-wide">Metric</th>
                    {result.candidates.map((c) => {
                      const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <th key={c.candidateId} className="text-center px-5 py-4 font-bold text-slate-900 dark:text-white min-w-44">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              {initials}
                            </div>
                            <span className="text-sm">{c.name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Overall AI Score */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">
                      <div className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-indigo-500" />Overall AI Score</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4 text-center">
                        <ScoreBar value={c.matchScore ?? null} />
                      </td>
                    ))}
                  </tr>
                  {/* GitHub */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-900/20">
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">
                      <div className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" />GitHub Score</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4 text-center">
                        <ScoreBar value={c.githubScore ?? null} />
                      </td>
                    ))}
                  </tr>
                  {/* LinkedIn */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">
                      <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />LinkedIn Score</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4 text-center">
                        <ScoreBar value={c.linkedinScore ?? null} />
                      </td>
                    ))}
                  </tr>
                  {/* AI Confidence */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-900/20">
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">
                      <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" />AI Confidence</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4 text-center">
                        {c.hiringRecommendation ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                            Evaluated
                          </span>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                      </td>
                    ))}
                  </tr>
                  {/* Strengths */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide align-top">
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />Strengths</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.supportingSkills.slice(0, 4).map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                              {s}
                            </span>
                          ))}
                          {c.supportingSkills.length === 0 && <span className="text-slate-400 text-sm">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Gaps */}
                  <tr>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide align-top">
                      <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500" />Skill Gaps</div>
                    </td>
                    {result.candidates.map((c) => (
                      <td key={c.candidateId} className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.missingSkills.slice(0, 4).map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                              {s}
                            </span>
                          ))}
                          {c.missingSkills.length === 0 && <span className="text-slate-400 text-sm">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {result.aiSummary && (
            <Card className="glass-card rounded-2xl border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Brain className="w-4 h-4 text-indigo-500" />AI Evaluation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <blockquote className="border-l-4 border-indigo-400 pl-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {result.aiSummary}
                </blockquote>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  This is an AI evaluation only. The final candidate decision rests with the recruiter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
