import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { workflowsApi, type WorkflowNode, type WorkflowEdge } from "@/lib/api";
import { ReactFlow, Background, Controls, MiniMap, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, RefreshCw,
  Loader2, Activity, PauseCircle, Brain, GitBranch, Zap, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Custom agent node for React Flow
function AgentNode({ data }: { data: WorkflowNode["data"] }) {
  const statusStyles: Record<string, { border: string; bg: string; glow: string }> = {
    success: { border: "border-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", glow: "shadow-emerald-100 dark:shadow-emerald-900/30" },
    failed: { border: "border-red-400", bg: "bg-red-50 dark:bg-red-900/20", glow: "shadow-red-100 dark:shadow-red-900/30" },
    waiting_approval: { border: "border-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", glow: "shadow-amber-100 dark:shadow-amber-900/30" },
    retrying: { border: "border-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", glow: "shadow-orange-100" },
    skipped: { border: "border-slate-300 dark:border-slate-600", bg: "bg-slate-50 dark:bg-slate-800", glow: "" },
  };
  const style = statusStyles[data.status] ?? { border: "border-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", glow: "shadow-indigo-100" };

  const StatusIcon = data.status === "success" ? CheckCircle
    : data.status === "failed" ? XCircle
    : data.status === "waiting_approval" ? Clock
    : Activity;
  const iconColor = data.status === "success" ? "text-emerald-500"
    : data.status === "failed" ? "text-red-500"
    : data.status === "waiting_approval" ? "text-amber-500"
    : "text-slate-400";

  return (
    <div className={`px-4 py-3 rounded-xl border-2 shadow-md ${style.border} ${style.bg} ${style.glow} min-w-[200px] backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <span className="text-sm font-semibold text-slate-800 dark:text-white">{data.label}</span>
      </div>
      {data.outputSummary && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{data.outputSummary}</p>}
      {data.executionTimeMs != null && (
        <p className="text-xs text-slate-400 mt-1">{(data.executionTimeMs / 1000).toFixed(1)}s</p>
      )}
      {data.retryCount != null && data.retryCount > 0 && (
        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Retry #{data.retryCount}</span>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { agentNode: AgentNode };

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  running: { badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", dot: "bg-blue-500 animate-pulse" },
  completed: { badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  paused: { badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  failed: { badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800", dot: "bg-red-500" },
};

export default function WorkflowDetail() {
  const [, params] = useRoute("/workflows/:id");
  const workflowId = params?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [approveNotes, setApproveNotes] = useState("");

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => workflowsApi.get(workflowId),
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data as { status?: string } | undefined;
      return data?.status === "running" ? 3000 : false;
    },
  });

  const approve = useMutation({
    mutationFn: (approved: boolean) => workflowsApi.approve(workflowId, approved, approveNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", workflowId] });
      toast({ title: "Decision submitted", description: "The workflow has been updated." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: String(err) }),
  });

  const retry = useMutation({
    mutationFn: () => workflowsApi.retry(workflowId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", workflowId] });
      toast({ title: "Pipeline restarted" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Retry failed", description: String(err) }),
  });

  if (isLoading) return (
    <div className="p-8 max-w-6xl mx-auto space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-[500px] rounded-2xl" />
    </div>
  );
  if (!workflow) return (
    <div className="p-8 text-center py-20">
      <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-400">Workflow not found</p>
    </div>
  );

  const candidate = typeof workflow.candidateId === "object"
    ? (workflow.candidateId as { name: string }).name
    : String(workflow.candidateId).slice(-8);
  const job = typeof workflow.jobId === "object"
    ? (workflow.jobId as { title: string }).title
    : "Unknown Job";
  const initials = candidate.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const flowNodes = (workflow.nodes || []).map((n: WorkflowNode) => ({ ...n, type: "agentNode" }));
  const flowEdges = (workflow.edges || []) as WorkflowEdge[];

  const statusStyle = STATUS_STYLES[workflow.status] ?? STATUS_STYLES.running;

  const stepsCompleted = (workflow.logs ?? []).filter((l: any) => l.status === "success").length;
  const totalSteps = (workflow.logs ?? []).length;
  const progress = totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <Link href="/workflows">
        <a className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Pipelines
        </a>
      </Link>

      {/* Header Card */}
      <div className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />
        <div className="flex items-start justify-between gap-4 relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{candidate}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Evaluation pipeline for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{job}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold ${statusStyle.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  {workflow.status === "paused" ? "Awaiting Recruiter Review" : workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Step: <span className="font-medium text-slate-600 dark:text-slate-300">{workflow.currentState?.replace(/_/g, " ") ?? "—"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {workflow.status === "failed" && (
              <Button size="sm" variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending} className="rounded-xl">
                {retry.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span className="ml-1.5">Retry Pipeline</span>
              </Button>
            )}
            {/* Progress */}
            {totalSteps > 0 && (
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{progress}%</p>
                <p className="text-xs text-slate-400">{stepsCompleted}/{totalSteps} steps</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="mt-4 relative">
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Human Review Gate */}
      {workflow.status === "paused" && workflow.currentState === "human_approval" && (
        <div className="glass-card rounded-2xl p-5 mb-6 border-2 border-amber-300 dark:border-amber-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-amber-50/60 dark:bg-amber-900/10 pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-300">Recruiter Review Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                The AI evaluation is complete. Review the candidate's full intelligence report, then advance the pipeline or pause for further consideration.
                <span className="font-semibold"> The hiring decision is yours.</span>
              </p>
              <div className="flex items-start gap-3 mt-3">
                <div className="flex-1">
                  <textarea
                    className="w-full p-3 text-sm border border-amber-200 dark:border-amber-700 rounded-xl bg-white dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 placeholder:text-slate-400"
                    rows={2}
                    placeholder="Optional recruiter notes..."
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => approve.mutate(true)}
                  disabled={approve.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  {approve.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Advance Pipeline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => approve.mutate(false)}
                  disabled={approve.isPending}
                  className="rounded-xl border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <PauseCircle className="w-3.5 h-3.5 mr-1.5" />Hold for Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* React Flow Graph */}
        <div className="lg:col-span-2">
          <Card className="glass-card rounded-2xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Zap className="w-4 h-4 text-indigo-500" />AI Agent Pipeline Graph
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {flowNodes.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                  {workflow.status === "running" ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="font-medium">AI pipeline executing...</p>
                      <p className="text-xs mt-1 text-slate-400">Graph will appear as agents complete their work</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No pipeline steps logged yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: 520 }} className="rounded-b-2xl overflow-hidden">
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    nodeTypes={nodeTypes}
                    fitView
                    attributionPosition="bottom-right"
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step Log Timeline */}
        <div>
          <Card className="glass-card rounded-2xl border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Brain className="w-4 h-4 text-indigo-500" />Agent Step Log
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[520px] pr-2">
              {(workflow.logs?.length ?? 0) === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No agent logs yet.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-4">
                    {workflow.logs?.map((log, idx) => {
                      const dotColor = log.status === "success" ? "bg-emerald-500"
                        : log.status === "failed" ? "bg-red-500"
                        : "bg-indigo-500";
                      return (
                        <div key={log.id ?? idx} className="relative pl-6">
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${dotColor} shadow`} />
                          <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight">{log.agentName}</p>
                          <p className={`text-xs mt-0.5 capitalize font-medium ${log.status === "success" ? "text-emerald-600 dark:text-emerald-400" : log.status === "failed" ? "text-red-600 dark:text-red-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                            {log.status}
                          </p>
                          {log.outputSummary && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{log.outputSummary}</p>}
                          {log.error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{log.error}</p>}
                          {log.executionTimeMs != null && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{(log.executionTimeMs / 1000).toFixed(1)}s</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recruiter reminder */}
      {workflow.status === "completed" && (
        <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-400">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            The AI evaluation pipeline has completed. All scores and rankings are for informational purposes only.
            <span className="font-semibold"> The recruiter makes all hiring decisions.</span>
          </p>
        </div>
      )}
    </div>
  );
}
