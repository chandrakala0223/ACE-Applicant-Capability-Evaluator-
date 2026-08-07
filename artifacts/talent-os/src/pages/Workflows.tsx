import { useQuery } from "@tanstack/react-query";
import { workflowsApi, type Workflow } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { GitBranch, ChevronRight, Clock, CheckCircle, AlertCircle, Activity, Pause, Zap } from "lucide-react";

// Must import React for the element type
import type React from "react";

const STATUS_ICONS: Record<string, React.ElementType> = {
  running: Activity,
  completed: CheckCircle,
  paused: Pause,
  failed: AlertCircle,
};

const STATUS_STYLES: Record<string, { dot: string; badge: string; icon: string }> = {
  running: {
    dot: "bg-blue-500 animate-pulse",
    badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: "text-blue-500",
  },
  completed: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-500",
  },
  paused: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: "text-amber-500",
  },
  failed: {
    dot: "bg-red-500",
    badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: "text-red-500",
  },
};

export default function Workflows() {
  const [status, setStatus] = useState("all");

  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ["workflows", status],
    queryFn: () => workflowsApi.list(status !== "all" ? { status } : undefined),
    refetchInterval: 5000,
  });

  const counts = (workflows ?? []).reduce<Record<string, number>>((acc, w) => {
    acc[w.status] = (acc[w.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Evaluation Pipeline</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor the 15-step AI candidate evaluation workflow</p>
          </div>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 rounded-xl border-slate-200 dark:border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Awaiting Review</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats strip */}
      {!isLoading && (workflows?.length ?? 0) > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { key: "running", label: "Running", icon: Activity, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { key: "completed", label: "Completed", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { key: "paused", label: "Awaiting Review", icon: Pause, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { key: "failed", label: "Failed", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
          ].map(({ key, label, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`glass-card rounded-2xl p-4 text-left transition-all border-2 ${status === key ? "border-indigo-400" : "border-transparent"}`}
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{counts[key] ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm mb-4">
          {error instanceof Error ? error.message : "Failed to load workflows"}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : workflows?.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 opacity-30" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">No workflows yet</p>
          <p className="text-sm mt-1">Upload a candidate resume to trigger the AI evaluation pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows?.map((w) => <WorkflowRow key={w.id} workflow={w} />)}
        </div>
      )}
    </div>
  );
}

function WorkflowRow({ workflow: w }: { workflow: Workflow }) {
  const Icon = STATUS_ICONS[w.status] ?? Activity;
  const styles = STATUS_STYLES[w.status] ?? STATUS_STYLES.running;

  const candidate = typeof w.candidateId === "object" && w.candidateId !== null
    ? (w.candidateId as { name: string; email: string }).name
    : String(w.candidateId).slice(-8);

  const job = typeof w.jobId === "object" && w.jobId !== null
    ? (w.jobId as { title: string }).title
    : String(w.jobId).slice(-8);

  const initials = candidate.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Link href={`/workflows/${w.id}`}>
      <a className="block">
        <Card className="glass-card rounded-2xl border-0 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{candidate}</h3>
                  <span className="text-slate-400 text-xs">for</span>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">{job}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${styles.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    {w.status === "paused" ? "Awaiting Review" : w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </span>
                  {/* Current step */}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Step: <span className="font-medium text-slate-600 dark:text-slate-300">{w.currentState?.replace(/_/g, " ") ?? "—"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.icon}>
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
