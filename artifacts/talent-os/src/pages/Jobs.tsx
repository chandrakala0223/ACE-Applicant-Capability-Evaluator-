import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, candidatesApi, type Job } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Briefcase, Users, MoreHorizontal, Pencil, Trash2,
  Copy, Globe, XCircle, Loader2, ChevronRight, TrendingUp,
  Trophy, Sparkles, Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// ─── JobForm extracted as TOP-LEVEL component ─────────────────────────────────
// CRITICAL: Must NOT be defined inside Jobs(). If defined inside, React treats
// it as a new component type on every render, causing inputs to unmount/remount
// which prevents typing and keeps the button disabled.
interface JobFormProps {
  form: { title: string; description: string; requiredSkills: string; preferredSkills: string; minExperience: string };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; requiredSkills: string; preferredSkills: string; minExperience: string }>>;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}

function JobForm({ form, setForm, onSubmit, onCancel, pending, submitLabel }: JobFormProps) {
  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Job Title *</Label>
        <Input
          placeholder="Senior Frontend Engineer"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description *</Label>
        <Textarea
          placeholder="Describe the role and responsibilities..."
          rows={4}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Required Skills <span className="text-slate-400 font-normal">(comma separated)</span></Label>
        <Input
          placeholder="React, TypeScript, Node.js"
          value={form.requiredSkills}
          onChange={(e) => setForm((prev) => ({ ...prev, requiredSkills: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Preferred Skills <span className="text-slate-400 font-normal">(comma separated)</span></Label>
        <Input
          placeholder="GraphQL, AWS, Docker"
          value={form.preferredSkills}
          onChange={(e) => setForm((prev) => ({ ...prev, preferredSkills: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Min. Experience (years)</Label>
        <Input
          type="number"
          min="0"
          value={form.minExperience}
          onChange={(e) => setForm((prev) => ({ ...prev, minExperience: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!form.title.trim() || !form.description.trim() || pending}
        >
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: "", description: "", requiredSkills: "", preferredSkills: "", minExperience: "0" };

export default function Jobs() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: jobs, isLoading: jobsLoading, error } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () => jobsApi.list(search ? { search } : undefined),
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-all"],
    queryFn: () => candidatesApi.list(),
  });

  const create = useMutation({
    mutationFn: () => jobsApi.create({
      title: form.title,
      description: form.description,
      requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      preferredSkills: form.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      minExperience: parseInt(form.minExperience) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: "Job created successfully" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed to create job", description: String(err) }),
  });

  const update = useMutation({
    mutationFn: () => jobsApi.update(editJob!.id, {
      title: form.title,
      description: form.description,
      requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      preferredSkills: form.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      minExperience: parseInt(form.minExperience) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setEditJob(null);
      toast({ title: "Job updated" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed to update job", description: String(err) }),
  });

  const remove = useMutation({
    mutationFn: (jobId: string) => jobsApi.delete(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setDeleteJob(null);
      toast({ title: "Job deleted" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed to delete job", description: String(err) }),
  });

  const publish = useMutation({
    mutationFn: (jobId: string) => jobsApi.publish(jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast({ title: "Job published" }); },
    onError: (err) => toast({ variant: "destructive", title: "Failed to publish job", description: String(err) }),
  });

  const close = useMutation({
    mutationFn: (jobId: string) => jobsApi.close(jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast({ title: "Job closed" }); },
    onError: (err) => toast({ variant: "destructive", title: "Failed to close job", description: String(err) }),
  });

  const duplicate = useMutation({
    mutationFn: (jobId: string) => jobsApi.duplicate(jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast({ title: "Job duplicated" }); },
    onError: (err) => toast({ variant: "destructive", title: "Failed to duplicate job", description: String(err) }),
  });

  const openEdit = (job: Job) => {
    setForm({
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills.join(", "),
      preferredSkills: job.preferredSkills.join(", "),
      minExperience: String(job.minExperience),
    });
    setEditJob(job);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const cardVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Active <span className="text-ai-gradient">Target Positions</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure roles and monitor pipeline candidate scores</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer"><Plus className="w-4 h-4 mr-2" />New Job</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Job Posting</DialogTitle></DialogHeader>
            <JobForm
              form={form}
              setForm={setForm}
              onSubmit={() => create.mutate()}
              onCancel={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
              pending={create.isPending}
              submitLabel="Create Job"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editJob} onOpenChange={(o) => { if (!o) setEditJob(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <JobForm
            form={form}
            setForm={setForm}
            onSubmit={() => update.mutate()}
            onCancel={() => setEditJob(null)}
            pending={update.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteJob} onOpenChange={(o) => { if (!o) setDeleteJob(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteJob?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job posting and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteJob && remove.mutate(deleteJob.id)}
            >
              {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9 glass-card" placeholder="Search roles..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
          {error instanceof Error ? error.message : "Failed to load jobs"}
        </div>
      )}

      {jobsLoading || candidatesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : jobs?.length === 0 ? (
        <div className="text-center py-20 text-slate-400 glass-card rounded-xl">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No active positions</p>
          <p className="text-sm mt-1">Create your first role requirement to launch evaluations.</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {jobs?.map((job) => {
            const jobCandidates = candidates?.filter((c) => c.jobId === job.id || c.jobId === job._id) || [];
            const evaluatedCount = jobCandidates.length;

            const scores = jobCandidates.map((c) => c.overallScore || c.matchScore || 0);
            const avgAI = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const topScore = scores.length > 0 ? Math.max(...scores) : 0;

            const rolePopularity = evaluatedCount >= 5 ? "High Volume" : evaluatedCount >= 2 ? "Active" : "Quiet";

            return (
              <motion.div variants={cardVariants} key={job.id}>
                <Card className="glass-card hover:shadow-md transition-all duration-300 group border-slate-200/50 dark:border-slate-800">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                      <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0 cursor-pointer space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {job.title}
                          </h3>
                          <Badge variant="outline" className="capitalize text-xs font-semibold">
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{job.description}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-pink-500" /> Top Skills:
                          </span>
                          {job.requiredSkills.slice(0, 4).map((s) => (
                            <span key={s} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                          {job.requiredSkills.length > 4 && (
                            <span className="text-xs text-slate-400">+{job.requiredSkills.length - 4} more</span>
                          )}
                        </div>
                      </Link>

                      {/* AI Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="text-center md:text-left min-w-[90px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Score</p>
                          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center md:justify-start gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> {avgAI > 0 ? `${avgAI}/100` : "—"}
                          </p>
                        </div>

                        <div className="text-center md:text-left min-w-[90px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Score</p>
                          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center md:justify-start gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" /> {topScore > 0 ? `${topScore}/100` : "—"}
                          </p>
                        </div>

                        <div className="text-center md:text-left min-w-[90px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluated</p>
                          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center md:justify-start gap-1">
                            <Users className="w-3.5 h-3.5 text-blue-500" /> {evaluatedCount}
                          </p>
                        </div>

                        <div className="text-center md:text-left min-w-[90px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Popularity</p>
                          <p className="text-sm font-extrabold mt-0.5 text-slate-700 dark:text-slate-300">
                            {rolePopularity}
                          </p>
                        </div>
                      </div>

                      {/* Dropdown Menu actions */}
                      <div className="flex items-center gap-2 self-center shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEdit(job)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate.mutate(job.id)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {job.status === "draft" && (
                              <DropdownMenuItem onClick={() => publish.mutate(job.id)} className="text-green-600">
                                <Globe className="w-4 h-4 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            {job.status === "active" && (
                              <DropdownMenuItem onClick={() => close.mutate(job.id)} className="text-yellow-600">
                                <XCircle className="w-4 h-4 mr-2" /> Close
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteJob(job)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Link href={`/jobs/${job.id}`}>
                          <ChevronRight className="w-5 h-5 text-slate-300 hover:text-slate-500 cursor-pointer" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
