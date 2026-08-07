import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { candidatesApi, jobsApi, type Candidate, type Job } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Users, Search, ChevronRight, TrendingUp, Sparkles, Trophy,
  Briefcase, GraduationCap, Github, FileText, Calendar, Filter, X
} from "lucide-react";
import { motion } from "framer-motion";

export default function Candidates() {
  const [search, setSearch] = useState("");
  const [jobId, setJobId] = useState("all");
  
  // Advanced Filter states
  const [minScore, setMinScore] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [educationFilter, setEducationFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minGithubScore, setMinGithubScore] = useState<number>(0);
  const [minResumeScore, setMinResumeScore] = useState<number>(0);

  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsApi.list() });

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candidatesApi.list(),
  });

  const clearFilters = () => {
    setSearch("");
    setJobId("all");
    setMinScore(0);
    setMinExperience(0);
    setEducationFilter("");
    setSkillFilter("");
    setMinGithubScore(0);
    setMinResumeScore(0);
  };

  // ─── Client-side Search and Multi-Filtering ───
  const filteredCandidates = candidates?.filter((c) => {
    // 1. Search Query (Name, Email, College, Skills, GitHub, Experience, Role, Education)
    if (search.trim()) {
      const q = search.toLowerCase();
      const jobTitle = jobs?.find((j) => j.id === c.jobId || j._id === c.jobId)?.title || "";
      const skillsStr = (c.parsedResume?.skills || []).join(" ").toLowerCase();
      const eduStr = (c.parsedResume?.education || "").toLowerCase();
      const gh = (c.parsedResume?.githubUrl || "").toLowerCase();
      const expStr = c.parsedResume?.experience != null ? `${c.parsedResume.experience} years` : "";

      const match =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        eduStr.includes(q) ||
        skillsStr.includes(q) ||
        gh.includes(q) ||
        jobTitle.toLowerCase().includes(q) ||
        expStr.includes(q);

      if (!match) return false;
    }

    // 2. Applied Job / Role Filter
    if (jobId !== "all" && c.jobId !== jobId) return false;

    // 3. Overall AI Score Filter
    const score = c.overallScore || c.matchScore || 0;
    if (minScore > 0 && score < minScore) return false;

    // 4. Experience Filter
    const exp = c.parsedResume?.experience || 0;
    if (minExperience > 0 && exp < minExperience) return false;

    // 5. College / Education Filter (Word match)
    if (educationFilter.trim()) {
      const edu = (c.parsedResume?.education || "").toLowerCase();
      if (!edu.includes(educationFilter.toLowerCase())) return false;
    }

    // 6. Skills Filter (Word match)
    if (skillFilter.trim()) {
      const skills = (c.parsedResume?.skills || []).map((s) => s.toLowerCase());
      const hasSkill = skills.some((s) => s.includes(skillFilter.toLowerCase()));
      if (!hasSkill) return false;
    }

    // 7. GitHub Score Filter
    const ghScore = c.githubScore || 0;
    if (minGithubScore > 0 && ghScore < minGithubScore) return false;

    // 8. Resume Score Filter
    const resScore = c.resumeScore || 0;
    if (minResumeScore > 0 && resScore < minResumeScore) return false;

    return true;
  });

  const parentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Candidates <span className="text-ai-gradient">Intelligence Matrix</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Search, filter, and compare evaluated applicant ranks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel (Left Sidebar) */}
        <div className="glass-card border border-slate-200/50 dark:border-slate-800 rounded-xl p-5 h-fit space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filters
            </h2>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600">
              Clear All
            </Button>
          </div>

          {/* Job Target */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Role</label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="All jobs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {jobs?.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Overall AI Score */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Min AI Score</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{minScore || "Any"}</span>
            </div>
            <Slider value={[minScore]} min={0} max={100} step={5} onValueChange={([val]) => setMinScore(val)} />
          </div>

          {/* Experience */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Min Experience</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{minExperience ? `${minExperience} yrs` : "Any"}</span>
            </div>
            <Slider value={[minExperience]} min={0} max={15} step={1} onValueChange={([val]) => setMinExperience(val)} />
          </div>

          {/* GitHub Score */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Min GitHub Score</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{minGithubScore || "Any"}</span>
            </div>
            <Slider value={[minGithubScore]} min={0} max={100} step={5} onValueChange={([val]) => setMinGithubScore(val)} />
          </div>

          {/* Resume Score */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Min Resume Score</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{minResumeScore || "Any"}</span>
            </div>
            <Slider value={[minResumeScore]} min={0} max={100} step={5} onValueChange={([val]) => setMinResumeScore(val)} />
          </div>

          {/* Skill Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Required Skill</label>
            <Input className="text-xs" placeholder="e.g. React, Python" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
          </div>

          {/* College Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">College / University</label>
            <Input className="text-xs" placeholder="e.g. Stanford, CMR" value={educationFilter} onChange={(e) => setEducationFilter(e.target.value)} />
          </div>
        </div>

        {/* Candidate List Area (Right Side) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Inputs */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9 glass-card" placeholder="Search by name, email, skills, university, github..." value={search}
                onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load candidates"}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : filteredCandidates?.length === 0 ? (
            <div className="text-center py-20 text-slate-400 glass-card rounded-xl">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No candidates match filters</p>
              <p className="text-sm mt-1">Try refining search parameters or clearing filters.</p>
            </div>
          ) : (
            <motion.div
              variants={parentVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {filteredCandidates?.map((c) => (
                <CandidateRow key={c.id} candidate={c} jobs={jobs} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ candidate: c, jobs }: { candidate: Candidate; jobs?: Job[] }) {
  const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const jobTitle = jobs?.find((j) => j.id === c.jobId || j._id === c.jobId)?.title || "Software Engineer";
  const displayScore = c.overallScore != null && c.overallScore > 0 ? c.overallScore : (c.matchScore ?? 0);
  const pr = c.parsedResume;
  const experienceText = pr?.experience != null && pr.experience !== undefined && String(pr.experience) !== "?"
    ? `${pr.experience} ${Number(pr.experience) === 1 ? "yr" : "yrs"} exp`
    : "No Experience Info";

  const cardVariants = {
    hidden: { y: 10, opacity: 0 },
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
                
                {/* Profile Block */}
                <div className="flex items-center gap-4 min-w-[240px] max-w-[320px]">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-sm font-extrabold text-indigo-700 dark:text-indigo-400 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{c.name}</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">{jobTitle}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.email}</p>
                  </div>
                </div>

                {/* Candidate details (Experience & Education) */}
                <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-450 min-w-[180px] max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                    <span>{experienceText}</span>
                  </div>
                  {pr?.education && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                      <span className="truncate">{pr.education}</span>
                    </div>
                  )}
                </div>

                {/* Skills tags list */}
                {pr?.skills && (
                  <div className="flex flex-wrap gap-1 max-w-[200px] items-center">
                    {pr.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                        {s}
                      </span>
                    ))}
                    {pr.skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">+{pr.skills.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Scoring columns */}
                <div className="flex items-center gap-6 shrink-0 self-center">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall AI Score</div>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">{displayScore} / 100</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Score</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>

              </div>
            </CardContent>
          </Card>
        </motion.div>
      </a>
    </Link>
  );
}
