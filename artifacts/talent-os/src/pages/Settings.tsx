import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Database, Zap, Mail, Shield, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceStatus {
  mongodb: "connected" | "disconnected" | "unknown";
  qdrant: "connected" | "degraded" | "unknown";
  groq: "configured" | "unknown";
  openrouter: "configured" | "unknown";
  resend: "configured" | "optional";
  api: "online" | "offline";
}

export default function Settings() {
  const { user } = useAuth();

  const { data: health, isLoading: healthLoading, refetch: refetchHealth, dataUpdatedAt } = useQuery<{ status: string }>({
    queryKey: ["api-health"],
    queryFn: () => fetch("/api/healthz").then((r) => {
      if (!r.ok) throw new Error("API offline");
      return r.json();
    }),
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: serviceStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<ServiceStatus>({
    queryKey: ["api-status"],
    queryFn: () => fetch("/api/healthz/status").then((r) => {
      if (!r.ok) throw new Error("Status unavailable");
      return r.json();
    }),
    refetchInterval: 30_000,
    retry: false,
  });

  const isLoading = healthLoading || statusLoading;
  const apiOnline = !!health?.status;

  const services = [
    {
      icon: Wifi,
      label: "API Server",
      description: "TalentOS Express backend",
      status: apiOnline ? "online" : "offline",
      color: apiOnline ? "text-green-600" : "text-red-500",
    },
    {
      icon: Database,
      label: "MongoDB Atlas",
      description: "Primary database for candidates, jobs, and workflows",
      status: serviceStatus?.mongodb ?? (apiOnline ? "unknown" : "offline"),
      color: serviceStatus?.mongodb === "connected" ? "text-green-600" : "text-red-500",
    },
    {
      icon: Brain,
      label: "Qdrant",
      description: "Vector database for resume embeddings and RAG",
      status: serviceStatus?.qdrant ?? (apiOnline ? "unknown" : "offline"),
      color: serviceStatus?.qdrant === "connected" ? "text-green-600" : serviceStatus?.qdrant === "degraded" ? "text-yellow-500" : "text-slate-400",
    },
    {
      icon: Zap,
      label: "Groq LLM",
      description: "Fast AI inference (llama-3.3-70b-versatile)",
      status: serviceStatus?.groq ?? "configured",
      color: "text-indigo-600",
    },
    {
      icon: Brain,
      label: "OpenRouter",
      description: "Fallback LLM provider",
      status: serviceStatus?.openrouter ?? "configured",
      color: "text-indigo-600",
    },
    {
      icon: Mail,
      label: "Resend",
      description: "Email delivery for interview invitations",
      status: serviceStatus?.resend ?? "optional",
      color: "text-slate-400",
    },
  ];

  const statusVariant = (s: string) => {
    if (s === "connected" || s === "online" || s === "configured") return "default";
    if (s === "offline" || s === "disconnected") return "destructive";
    if (s === "degraded") return "outline";
    return "secondary";
  };

  const statusColor = (s: string) => {
    if (s === "connected" || s === "online" || s === "configured") return "bg-green-100 text-green-700 border-0";
    if (s === "offline" || s === "disconnected") return "bg-red-100 text-red-700 border-0";
    if (s === "degraded") return "bg-yellow-100 text-yellow-700 border-0";
    return "bg-slate-100 text-slate-600 border-0";
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Account and platform configuration</p>
      </div>

      {/* Account */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your TalentOS account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Services */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Platform Services</CardTitle>
              <CardDescription>Live status of AI and infrastructure services</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchHealth(); refetchStatus(); }}
              className="text-slate-500 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {services.map(({ icon: Icon, label, description, status, color }) => (
            <div key={label} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full bg-slate-200 animate-pulse" />
                ) : (
                  <Icon className={`w-4 h-4 ${color}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-20 rounded-full" />
              ) : (
                <Badge className={`text-xs shrink-0 ${statusColor(status)}`}>
                  {status}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {!apiOnline && !isLoading && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <WifiOff className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">API Server is offline</p>
                <p className="text-xs text-yellow-700 mt-1">
                  The backend is not reachable. If MongoDB Atlas is rejecting the connection, go to{" "}
                  <strong>MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)</strong>{" "}
                  then restart the API Server workflow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Pipeline Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> AI Pipeline
          </CardTitle>
          <CardDescription>15-step intelligent hiring workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              "Resume Parser", "Embedding Agent", "GitHub Analysis", "LinkedIn Analysis",
              "Portfolio Analyzer", "Coding Profile", "Skill Matching", "Project Evaluation",
              "Shortlisting", "Role Recommendation", "Hiring Recommendation", "Candidate Ranking",
              "Human Approval Gate", "Interview Questions", "Email Notification",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-2 py-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-700">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
