import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Star, XCircle, Bell } from "lucide-react";
import { Link } from "wouter";

function relativeTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const typeConfig = {
  workflow_completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  approval_required: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  shortlisted: { icon: Star, color: "text-indigo-600", bg: "bg-indigo-50" },
  rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
};

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const cfg = typeConfig[n.type] ?? typeConfig.workflow_completed;
  const Icon = cfg.icon;

  const inner = (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${n.read ? "bg-white border-slate-100" : "bg-slate-50 border-slate-200"} hover:bg-slate-50`}
      onClick={() => !n.read && onRead(n.id)}
    >
      <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${n.read ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
        <p className="text-xs text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
    </div>
  );

  if (n.type === "approval_required") {
    return <Link href="/workflows"><a className="block">{inner}</a></Link>;
  }
  return inner;
}

export default function Notifications() {
  const qc = useQueryClient();

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications?.filter((n) => !n.read) ?? [];

  function markAllRead() {
    unread.forEach((n) => markRead.mutate(n.id));
  }

  if (isLoading) return (
    <div className="p-8 max-w-3xl mx-auto space-y-3">
      <Skeleton className="h-9 w-48 mb-6" />
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load notifications: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unread.length > 0 && (
            <Badge className="bg-indigo-600 text-white">{unread.length} unread</Badge>
          )}
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={markRead.isPending}>
            Mark all read
          </Button>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium">No notifications yet</p>
          <p className="text-sm mt-1">They'll appear here as AI processes applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem key={n.id} n={n} onRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
