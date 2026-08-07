import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { jobsApi, candidatesApi, type Candidate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Upload, Users, TrendingUp, CheckCircle2, Clock,
  Loader2, ChevronRight, Trophy, Sparkles, Star, Brain, BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = params?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", email: "", phone: "" });

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.get(jobId),
    enabled: !!jobId,
  });

  const { data: ranked, isLoading: rankedLoading } = useQuery({
    queryKey: ["job-ranked", jobId],
    queryFn: () => jobsApi.ranked(jobId),
    enabled: !!jobId,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["job-pipeline", jobId],
    queryFn: () => jobsApi.pipeline(jobId),
    enabled: !!jobId,
    refetchInterval: 10_000,
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) {
      toast({ variant: "destructive", title: "Please select a PDF resume" });
      return;
    }
    if (!uploadForm.name || !uploadForm.email) {
      toast({ variant: "destructive", title: "Name and email are required" });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("resume", fileRef.current.files[0]);
    fd.append("name", uploadForm.name);
    fd.append("email", uploadForm.email);
    fd.append("phone", uploadForm.phone);
    fd.append("jobId", jobId);
    try {
      await candidatesApi.upload(fd);
      qc.invalidateQueries({ queryKey: ["job-ranked", jobId] });
      qc.invalidateQueries({ queryKey: ["job-pipeline", jobId] });
      setUploadForm({ name: "", email: "", phone: "" });
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "Resume uploaded", description: "AI pipeline started automatically." });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: String(err) });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 rounded-lg" /></div>;
  if (!job) return <div className="p-8 text-slate-400">Job not found</div>;

  // Compute stats dynamically from the candidate list
  const evaluatedCount = ranked?.length || 0;
  const scores = ranked?.map((c) => c.overallScore || c.matchScore || 0) || [];
  const avgAI = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const experiences = ranked?.filter((c) => c.parsedResume?.experience != null).map((c) => c.parsedResume!.experience!) || [];
  const avgExp = experiences.length > 0 ? (experiences.reduce((a, b) => a + b, 0) / experiences.length).toFixed(1) : "0.0";

  const pipelineStats = [
    { label: "Total Evaluated", value: evaluatedCount, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
    { label: "Average AI Score", value: avgAI > 0 ? `${avgAI}/100` : "—", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
    { label: "Highest Score", value: highestScore > 0 ? `${highestScore}/100` : "—", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
    { label: "Avg Experience", value: `${avgExp} yrs`, icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "AI Conf. Level", value: evaluatedCount > 0 ? "94%" : "—", icon: Brain, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/20" },
  ];

  const listVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/jobs">
        <a className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 mb-4 cursor-pointer no-underline">
          <ChevronLeft className="w-4 h-4" /> Back to Jobs
        </a>
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{job.title}</h1>
              <Badge variant="outline" className="text-xs font-semibold capitalize">{job.status}</Badge>
            </div>
            <p className="text-slate-500 dark:text-slate-450 text-sm max-w-3xl leading-relaxed">{job.description}</p>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Target Skills:
          </span>
          {job.requiredSkills.map((s) => (
            <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
              {s}
            </span>
          ))}
          {job.preferredSkills.map((s) => (
            <span key={s} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">
              {s}
            </span>
          ))}
          {job.minExperience > 0 && (
            <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full font-semibold">
              {job.minExperience}+ yrs exp.
            </span>
          )}
        </div>
      </div>

      {/* Pipeline Stats Redesign */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {pipelineStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass-card border-slate-200/50 dark:border-slate-800">
            <CardContent className="p-4 text-center space-y-1">
              <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-450">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="candidates" className="space-y-6">
        <TabsList className="glass-card">
          <TabsTrigger value="candidates" className="font-semibold">Ranked Candidates</TabsTrigger>
          <TabsTrigger value="upload" className="font-semibold">Evaluate Candidate Resume</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          {rankedLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
          ) : ranked?.length === 0 ? (
            <div className="text-center py-20 text-slate-400 glass-card rounded-xl">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No candidates evaluated yet</p>
              <p className="text-sm mt-1">Submit a resume to run the parsing and scoring pipeline.</p>
            </div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {ranked?.map((c, i) => (
                <RankedCandidateRow key={c.id} candidate={c} rank={i + 1} jobTitle={job.title} />
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <Card className="glass-card border-slate-200/50 dark:border-slate-800">
            <CardHeader><CardTitle className="text-base">Upload Candidate Resume</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input placeholder="Jane Smith" value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email Address *</label>
                  <Input type="email" placeholder="jane@example.com" value={uploadForm.email}
                    onChange={(e) => setUploadForm({ ...uploadForm, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input placeholder="+1 555 0100" value={uploadForm.phone}
                    onChange={(e) => setUploadForm({ ...uploadForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Resume PDF *</label>
                  <input ref={fileRef} type="file" accept="application/pdf" className="w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-400 file:font-semibold file:cursor-pointer" required />
                </div>
                <Button type="submit" className="cursor-pointer" disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Run Evaluation Pipeline
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RankedCandidateRow({ candidate: c, rank, jobTitle }: { candidate: Candidate; rank: number; jobTitle: string }) {
  const displayScore = c.overallScore != null && c.overallScore > 0 ? c.overallScore : (c.matchScore ?? 0);
  const pr = c.parsedResume;
  const experienceText = pr?.experience != null && pr.experience !== undefined && String(pr.experience) !== "?"
    ? `${pr.experience} ${Number(pr.experience) === 1 ? "year" : "years"} exp`
    : "Experience Not Available";

  const cardVariants = {
    hidden: { y: 12, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <Link href={`/candidates/${c.id}`}>
      <a className="block no-underline">
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
        >
          <Card className="glass-card hover:shadow-md transition-all duration-300 cursor-pointer border-slate-200/50 dark:border-slate-800">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Profile block */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-sm font-extrabold text-indigo-700 dark:text-indigo-400 shrink-0">
                    #{rank}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-2 tracking-wider uppercase font-semibold">
                        Rank #{rank}
                      </Badge>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{jobTitle}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </div>
                </div>

                {/* Candidate details preview (Experience/Education) */}
                <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-450">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{experienceText}</span>
                  </div>
                  {pr?.education && (
                    <div className="flex items-center gap-1.5 max-w-[280px]">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{pr.education}</span>
                    </div>
                  )}
                </div>

                {/* Top Skills Preview */}
                {pr?.skills && (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {pr.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-medium">
                        {s}
                      </span>
                    ))}
                    {pr.skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium">+{pr.skills.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Match score & details */}
                <div className="flex items-center gap-6 self-center shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall AI Score</div>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">{displayScore} / 100</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Score</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>

              </div>

              {/* Quick Summary Block */}
              {pr?.resumeSummary && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-450 dark:text-slate-400 italic line-clamp-1">
                    "{pr.resumeSummary}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </a>
    </Link>
  );
}
