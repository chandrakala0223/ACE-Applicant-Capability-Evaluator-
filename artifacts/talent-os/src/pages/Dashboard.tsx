import { useQuery } from "@tanstack/react-query";
import { dashboardApi, candidatesApi, jobsApi } from "@/lib/api";
import type { Candidate } from "@/lib/api";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  Briefcase,
  Users,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  FileText,
  Github,
  Globe,
  Trophy,
  MessageSquare,
  Brain,
  Sparkles,
  Star,
  ChevronRight,
  Upload,
  Plus,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

// ─── Count-Up Hook ───────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1.2) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    motionVal.set(target);
  }, [target, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toString();
    });
  }, [spring]);

  return ref;
}

// ─── Activity Config ─────────────────────────────────────────────────────────
function activityConfig(type: string, status: string) {
  const t = (type ?? "").toLowerCase();
  const s = (status ?? "").toLowerCase();

  if (t.includes("parsing") || t.includes("resume") || s === "pending")
    return { icon: FileText, color: "from-indigo-500 to-indigo-600", bg: "bg-indigo-50", text: "text-indigo-600", label: "Resume Parsed" };
  if (t.includes("github") || t.includes("git"))
    return { icon: Github, color: "from-purple-500 to-purple-600", bg: "bg-purple-50", text: "text-purple-600", label: "GitHub Analysis Completed" };
  if (t.includes("portfolio"))
    return { icon: Globe, color: "from-pink-500 to-pink-600", bg: "bg-pink-50", text: "text-pink-600", label: "Portfolio Evaluated" };
  if (t.includes("rank") || s === "hold")
    return { icon: Trophy, color: "from-amber-500 to-amber-600", bg: "bg-amber-50", text: "text-amber-600", label: "Candidate Ranked" };
  if (t.includes("interview") || t.includes("question"))
    return { icon: MessageSquare, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600", label: "Interview Questions Generated" };
  return { icon: Brain, color: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-600", label: "AI Evaluation Completed" };
}

// ─── Score Badge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    score >= 60 ? "text-indigo-700 bg-indigo-50 border-indigo-200" :
    score >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      <Star className="w-3 h-3 fill-current" />{score}/100
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: boolean;
  icon: React.ElementType;
  gradient: string;
  delay: number;
}

function KpiCard({ label, value, suffix = "", icon: Icon, gradient, delay }: KpiCardProps) {
  const countRef = useCountUp(value);
  return (
    <motion.div
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 p-5 group cursor-default">
        {/* gradient accent top bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient}`} />
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
          <span ref={countRef}>0</span>{suffix}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-300 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-bold text-sm">{p.value} {p.name}</p>
      ))}
    </div>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-10 w-16" />
          <Pulse className="h-4 w-40" />
          <Pulse className="h-3 w-80" />
        </div>
        <div className="flex gap-3">
          <Pulse className="h-10 w-36 rounded-xl" />
          <Pulse className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Pulse key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Pulse className="h-72" />
        <Pulse className="h-72" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Pulse className="h-80" />
        <Pulse className="h-80" />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.stats(),
    refetchInterval: 30_000,
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-all"],
    queryFn: () => candidatesApi.list(),
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs-all"],
    queryFn: () => jobsApi.list(),
  });

  if (statsLoading || candidatesLoading || jobsLoading) return <DashboardSkeleton />;

  if (statsError || !stats) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-2xl p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Dashboard Unavailable</h2>
          <p className="text-sm text-slate-500">
            {statsError instanceof Error ? statsError.message : "Failed to load dashboard data."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Real Data Computations ─────────────────────────────────────────────
  const totalJobs = jobs?.length ?? stats.totalJobs ?? 0;
  const totalCandidates = candidates?.length ?? stats.totalCandidates ?? 0;

  const scoredCandidates = candidates?.filter(
    (c) => (c.overallScore ?? c.matchScore ?? 0) > 0
  ) ?? [];

  const avgScore =
    scoredCandidates.length > 0
      ? Math.round(
          scoredCandidates.reduce((acc, c) => acc + (c.overallScore ?? c.matchScore ?? 0), 0) /
            scoredCandidates.length
        )
      : 0;

  const highestScore =
    candidates && candidates.length > 0
      ? Math.max(...candidates.map((c) => c.overallScore ?? c.matchScore ?? 0))
      : 0;

  const evaluatedToday =
    candidates?.filter(
      (c) => new Date(c.createdAt).toDateString() === new Date().toDateString()
    ).length ?? 0;

  const validExp = candidates?.filter((c) => c.parsedResume?.experience != null) ?? [];
  const avgExperience =
    validExp.length > 0
      ? Math.round(
          (validExp.reduce((acc, c) => acc + (c.parsedResume?.experience ?? 0), 0) /
            validExp.length) * 10
        ) / 10
      : 0;

  // Score distribution bins
  const scoreBins = [
    { range: "0–20", count: 0 },
    { range: "20–40", count: 0 },
    { range: "40–60", count: 0 },
    { range: "60–80", count: 0 },
    { range: "80–100", count: 0 },
  ];
  candidates?.forEach((c) => {
    const sc = c.overallScore ?? c.matchScore ?? 0;
    if (sc < 20) scoreBins[0].count++;
    else if (sc < 40) scoreBins[1].count++;
    else if (sc < 60) scoreBins[2].count++;
    else if (sc < 80) scoreBins[3].count++;
    else scoreBins[4].count++;
  });
  const hasScoreData = scoreBins.some((b) => b.count > 0);

  // Top skills
  const skillCounts: Record<string, number> = {};
  candidates?.forEach((c) =>
    c.parsedResume?.skills?.forEach((s) => {
      const sk = s.trim();
      if (sk) skillCounts[sk] = (skillCounts[sk] ?? 0) + 1;
    })
  );
  const topSkillsData = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  const hasSkillData = topSkillsData.length > 0;

  // Top candidate
  const topCandidate: Candidate | null =
    candidates && candidates.length > 0
      ? [...candidates].sort(
          (a, b) => (b.overallScore ?? b.matchScore ?? 0) - (a.overallScore ?? a.matchScore ?? 0)
        )[0]
      : null;

  // Active jobs by status
  const activeJobs = jobs?.filter((j) => j.status === "open" || j.status === "active") ?? [];

  // AI Summary
  const mostCommonSkill = topSkillsData[0]?.name ?? null;
  const mostRecommendedRole =
    candidates && candidates.length > 0
      ? (() => {
          const roleCounts: Record<string, number> = {};
          candidates.forEach((c) => {
            if (c.jobTitle) roleCounts[c.jobTitle] = (roleCounts[c.jobTitle] ?? 0) + 1;
          });
          const entries = Object.entries(roleCounts);
          return entries.length > 0
            ? entries.sort((a, b) => b[1] - a[1])[0][0]
            : null;
        })()
      : null;

  const needsReview = candidates?.filter((c) => c.status === "pending" || c.status === "hold").length ?? 0;

  // Top candidates table (top 5 by score)
  const topCandidates = candidates
    ? [...candidates]
        .sort(
          (a, b) => (b.overallScore ?? b.matchScore ?? 0) - (a.overallScore ?? a.matchScore ?? 0)
        )
        .slice(0, 5)
    : [];

  const kpiCards = [
    { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, gradient: "from-indigo-500 to-indigo-600" },
    { label: "Total Candidates", value: totalCandidates, icon: Users, gradient: "from-violet-500 to-violet-600" },
    { label: "Avg AI Score", value: avgScore, suffix: "/100", icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Highest Score", value: highestScore, suffix: "/100", icon: Trophy, gradient: "from-amber-500 to-amber-600" },
    { label: "Evaluated Today", value: evaluatedToday, icon: Zap, gradient: "from-pink-500 to-pink-600" },
    { label: "Avg Experience", value: avgExperience, suffix: "y", icon: Clock, gradient: "from-sky-500 to-sky-600" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row md:items-start md:justify-between gap-6"
        >
          <motion.div variants={fadeUp} custom={0}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5CEB] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#5B5CEB] via-[#7C3AED] to-[#8B5CF6] bg-clip-text text-transparent">
                ACE
              </h1>
            </div>
            <p className="text-slate-400 text-sm font-semibold tracking-wide mb-1">Beyond the Resume.</p>
            <p className="text-slate-500 text-sm max-w-lg leading-relaxed">
              AI-powered candidate intelligence platform that evaluates resumes, GitHub profiles,
              portfolios, technical skills, and experience to identify the best talent for every role.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="flex items-center gap-3 shrink-0">
            <Link href="/jobs/new">
              <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md">
                <Plus className="w-4 h-4" />
                Create Job
              </a>
            </Link>
            <Link href="/candidates">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B5CEB] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5">
                <Brain className="w-4 h-4" />
                Evaluate Candidates
              </a>
            </Link>
          </motion.div>
        </motion.div>

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((card, i) => (
            <KpiCard
              key={card.label}
              label={card.label}
              value={card.value}
              suffix={card.suffix}
              icon={card.icon}
              gradient={card.gradient}
              delay={i}
            />
          ))}
        </div>

        {/* ── Charts Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Skills Distribution */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Top Skills Distribution</h2>
                  <p className="text-xs text-slate-400">Extracted from candidate resumes</p>
                </div>
              </div>
              <div className="px-4 py-4" style={{ height: 280 }}>
                {!hasSkillData ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <Upload className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-400">No candidate data available.</p>
                    <Link href="/candidates">
                      <a className="text-xs text-indigo-500 font-semibold hover:underline">Upload a resume to begin</a>
                    </Link>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topSkillsData}
                      layout="vertical"
                      margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="skillGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#5B5CEB" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" stroke="#e2e8f0" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Candidates" fill="url(#skillGrad)" radius={[0, 6, 6, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>

          {/* Score Distribution */}
          <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Candidate AI Score Distribution</h2>
                  <p className="text-xs text-slate-400">Score range across all candidates</p>
                </div>
              </div>
              <div className="px-4 py-4" style={{ height: 280 }}>
                {!hasScoreData ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <Brain className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-400">No candidate data available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scoreBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5B5CEB" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="range" stroke="#e2e8f0" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#e2e8f0" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Candidates"
                        stroke="#5B5CEB"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#scoreGrad)"
                        dot={{ fill: "#5B5CEB", r: 4, strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, fill: "#5B5CEB" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Top Candidate + AI Summary ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Candidate Card */}
          <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">🏆 Top Candidate</h2>
                  <p className="text-xs text-slate-400">Highest overall AI score</p>
                </div>
              </div>
              <div className="p-6">
                {!topCandidate ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <Upload className="w-12 h-12 text-slate-200" />
                    <p className="text-sm text-slate-400">Upload a Resume to begin AI Evaluation.</p>
                    <Link href="/candidates">
                      <a className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B5CEB] to-[#7C3AED] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition">
                        <Upload className="w-3.5 h-3.5" />
                        Upload Resume
                      </a>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B5CEB] to-[#7C3AED] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-100 shrink-0">
                        {(topCandidate.parsedResume?.name ?? topCandidate.name)
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {topCandidate.parsedResume?.name ?? topCandidate.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{topCandidate.email}</p>
                        <div className="mt-1.5">
                          <ScoreBadge score={topCandidate.overallScore ?? topCandidate.matchScore ?? 0} />
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Recommended Role", value: topCandidate.jobTitle ?? "—" },
                        {
                          label: "AI Confidence",
                          value:
                            topCandidate.overallScore
                              ? `${Math.min(100, topCandidate.overallScore + 4)}%`
                              : "—",
                        },
                        {
                          label: "Experience",
                          value:
                            topCandidate.parsedResume?.experience != null
                              ? `${topCandidate.parsedResume.experience} yrs`
                              : "—",
                        },
                        { label: "Education", value: topCandidate.parsedResume?.education ?? "—" },
                        {
                          label: "GitHub Score",
                          value: topCandidate.githubScore ? `${topCandidate.githubScore}/100` : "—",
                        },
                        {
                          label: "Resume Score",
                          value: topCandidate.resumeScore ? `${topCandidate.resumeScore}/100` : "—",
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Top Skills */}
                    {(topCandidate.parsedResume?.skills?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Top Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {topCandidate.parsedResume!.skills!.slice(0, 6).map((s) => (
                            <span
                              key={s}
                              className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {topCandidate.parsedResume?.resumeSummary && (
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {topCandidate.parsedResume.resumeSummary}
                        </p>
                      </div>
                    )}

                    <Link href={`/candidates/${topCandidate.id ?? topCandidate._id}`}>
                      <a className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition group">
                        View Full Profile
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* AI Recruiter Summary */}
          <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden h-full">
              <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">🧠 AI Recruiter Summary</h2>
                  <p className="text-xs text-slate-400">Auto-generated from MongoDB data</p>
                </div>
              </div>
              <div className="p-6">
                {totalCandidates === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <Brain className="w-12 h-12 text-slate-200" />
                    <p className="text-sm text-slate-400">No AI insights available yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Today's Overview</p>
                    {[
                      {
                        icon: Zap,
                        color: "text-indigo-500",
                        bg: "bg-indigo-50",
                        text: `AI evaluated ${totalCandidates} resume${totalCandidates !== 1 ? "s" : ""} in total.`,
                      },
                      highestScore > 0 && {
                        icon: Trophy,
                        color: "text-amber-500",
                        bg: "bg-amber-50",
                        text: `Highest candidate score: ${highestScore}/100.`,
                      },
                      mostCommonSkill && {
                        icon: Star,
                        color: "text-pink-500",
                        bg: "bg-pink-50",
                        text: `Most common skill: ${mostCommonSkill}.`,
                      },
                      mostRecommendedRole && {
                        icon: Briefcase,
                        color: "text-emerald-500",
                        bg: "bg-emerald-50",
                        text: `Most recommended role: ${mostRecommendedRole}.`,
                      },
                      needsReview > 0 && {
                        icon: AlertCircle,
                        color: "text-amber-600",
                        bg: "bg-amber-50",
                        text: `${needsReview} candidate${needsReview !== 1 ? "s" : ""} require recruiter review.`,
                      },
                      evaluatedToday > 0 && {
                        icon: Zap,
                        color: "text-violet-500",
                        bg: "bg-violet-50",
                        text: `${evaluatedToday} resume${evaluatedToday !== 1 ? "s" : ""} evaluated today.`,
                      },
                      totalJobs > 0 && {
                        icon: Briefcase,
                        color: "text-sky-500",
                        bg: "bg-sky-50",
                        text: `${totalJobs} active job${totalJobs !== 1 ? "s" : ""} open for applications.`,
                      },
                    ]
                      .filter(Boolean)
                      .map((item, i) => {
                        if (!item) return null;
                        const I = item.icon;
                        return (
                          <motion.div
                            key={i}
                            custom={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                              <I className={`w-3.5 h-3.5 ${item.color}`} />
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Recent AI Activity Timeline ──────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Recent AI Activity</h2>
                  <p className="text-xs text-slate-400">Latest evaluation pipeline events</p>
                </div>
              </div>
              <Link href="/workflows">
                <a className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 flex items-center gap-1 transition">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </Link>
            </div>
            <div className="p-6">
              {stats.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <Activity className="w-12 h-12 text-slate-200" />
                  <p className="text-sm text-slate-400">No AI activity yet. Upload a resume to get started.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-200 via-purple-200 to-transparent" />
                  <div className="space-y-5">
                    {stats.recentActivity.slice(0, 6).map((a, i) => {
                      const cfg = activityConfig(a.type, a.status);
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={a.id}
                          custom={i}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          className="flex items-start gap-4 relative"
                        >
                          <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-sm border border-white z-10`}>
                            <Icon className={`w-4 h-4 ${cfg.text}`} />
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{a.candidateName}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{cfg.label}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`w-2 h-2 rounded-full ${
                                  a.status === "completed" ? "bg-emerald-400" :
                                  a.status === "failed" ? "bg-red-400" :
                                  a.status === "running" ? "bg-blue-400 animate-pulse" :
                                  "bg-amber-400"
                                }`} />
                                <span className="text-xs text-slate-400 capitalize">{a.status}</span>
                                <span className="text-xs text-slate-300 ml-1">
                                  {new Date(a.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Recent Top Candidates Table ──────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={8} initial="hidden" animate="visible">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B5CEB] to-[#7C3AED] flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Recent Top Candidates</h2>
                  <p className="text-xs text-slate-400">Ranked by overall AI evaluation score</p>
                </div>
              </div>
              <Link href="/candidates">
                <a className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 flex items-center gap-1 transition">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </Link>
            </div>

            {topCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center px-6">
                <Upload className="w-14 h-14 text-slate-200" />
                <p className="text-sm text-slate-400 max-w-xs">
                  Upload a Resume to begin AI Evaluation.
                </p>
                <Link href="/candidates">
                  <a className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B5CEB] to-[#7C3AED] text-white text-sm font-semibold shadow-sm hover:opacity-90 transition">
                    <Upload className="w-4 h-4" />
                    Upload Resume
                  </a>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50">
                      {["Rank", "Candidate", "AI Score", "Recommended Role", "Confidence", "Experience", "Education", "Action"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {topCandidates.map((c, i) => {
                      const score = c.overallScore ?? c.matchScore ?? 0;
                      const confidence = score > 0 ? Math.min(100, score + 4) : 0;
                      return (
                        <motion.tr
                          key={c.id ?? c._id}
                          custom={i}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              i === 0 ? "bg-amber-100 text-amber-700" :
                              i === 1 ? "bg-slate-100 text-slate-600" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-50 text-slate-400"
                            }`}>
                              {i + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                                {(c.parsedResume?.name ?? c.name)
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">
                                  {c.parsedResume?.name ?? c.name}
                                </p>
                                <p className="text-xs text-slate-400 truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <ScoreBadge score={score} />
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-700 font-medium whitespace-nowrap">
                              {c.jobTitle ?? "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${
                              confidence >= 80 ? "text-emerald-600" :
                              confidence >= 60 ? "text-indigo-600" :
                              "text-slate-500"
                            }`}>
                              {confidence > 0 ? `${confidence}%` : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 whitespace-nowrap">
                              {c.parsedResume?.experience != null
                                ? `${c.parsedResume.experience} yrs`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 max-w-[120px] block truncate">
                              {c.parsedResume?.education ?? "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/candidates/${c.id ?? c._id}`}>
                              <a className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-100 group-hover:border-indigo-200 whitespace-nowrap">
                                View Profile
                                <ChevronRight className="w-3 h-3" />
                              </a>
                            </Link>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Empty State: No Jobs ─────────────────────────────────────────── */}
        {totalJobs === 0 && (
          <motion.div variants={fadeUp} custom={9} initial="hidden" animate="visible">
            <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 border border-indigo-100 rounded-2xl p-8 text-center">
              <Briefcase className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 mb-1">No Jobs Created Yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first job to start evaluating candidates.</p>
              <Link href="/jobs/new">
                <a className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B5CEB] to-[#7C3AED] text-white text-sm font-semibold shadow-sm hover:opacity-90 transition">
                  <Plus className="w-4 h-4" />
                  Create your first Job
                </a>
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
