import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, Target, Award } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#4f46e5", "#dc2626", "#ca8a04", "#16a34a"];
const INDIGO = "#4f46e5";

export default function Analytics() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsApi.get(),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load analytics: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    </div>
  );

  if (!data) return null;

  const funnelPieData = [
    { name: "Shortlisted", value: data.hiringFunnel.shortlisted },
    { name: "Rejected", value: data.hiringFunnel.rejected },
    { name: "Hold", value: data.hiringFunnel.hold },
    { name: "Approved", value: data.hiringFunnel.approved },
  ].filter(d => d.value > 0);

  const shortlistRate = data.hiringFunnel.total > 0
    ? Math.round((data.hiringFunnel.shortlisted / data.hiringFunnel.total) * 100)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Recruitment intelligence & hiring insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Applications</p>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.hiringFunnel.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Match Score</p>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.avgMatchScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Confidence</p>
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.avgConfidence}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shortlist Rate</p>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{shortlistRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Hiring Funnel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Hiring Funnel</CardTitle></CardHeader>
          <CardContent>
            {funnelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={funnelPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      percent > 0.05 ? `${name} (${Math.round(percent * 100)}%)` : ""
                    }>
                    {funnelPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 py-8 text-center">No candidate data yet.</p>}
          </CardContent>
        </Card>

        {/* Experience Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Experience Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.experienceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Trend */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Hiring Trend — Last 30 Days</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.hiringTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="applications" stroke={INDIGO} strokeWidth={2} dot={false} name="Applications" />
              <Line type="monotone" dataKey="shortlisted" stroke="#16a34a" strokeWidth={2} dot={false} name="Shortlisted" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Skill Distribution */}
      {data.skillDistribution.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Skills Across Candidates</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.skillDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={INDIGO} radius={[0, 3, 3, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Jobs */}
      {data.topJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Jobs by Applications</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left py-2 font-medium">Job Title</th>
                  <th className="text-right py-2 font-medium">Candidates</th>
                  <th className="text-right py-2 font-medium">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {data.topJobs.map((job, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-900">{job.title}</td>
                    <td className="py-2.5 text-right text-slate-600">{job.candidateCount}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-semibold ${job.avgScore >= 70 ? "text-green-600" : job.avgScore >= 50 ? "text-yellow-600" : "text-slate-600"}`}>
                        {job.avgScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
