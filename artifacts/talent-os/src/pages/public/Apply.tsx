import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2, FileText } from "lucide-react";
import { Link } from "wouter";
import { PublicNav } from "@/components/layout/PublicNav";

export default function Apply() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const { data: job } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => publicApi.getJob(jobId!),
    enabled: !!jobId,
  });

  const apply = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("linkedinUrl", form.linkedinUrl.trim());
      fd.append("githubUrl", form.githubUrl.trim());
      fd.append("portfolioUrl", form.portfolioUrl.trim());
      fd.append("jobId", jobId!);
      if (resume) fd.append("resume", resume);
      return publicApi.apply(fd);
    },
    onSuccess: (data) => {
      setLocation(`/apply/${jobId}/processing/${data.workflowId}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!resume) {
      setError("Please upload your resume (PDF).");
      return;
    }
    apply.mutate();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setResume(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      <main className="max-w-2xl mx-auto px-6 py-10">
        {jobId && (
          <Link href={`/public/jobs/${jobId}`}>
            <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Job
            </Button>
          </Link>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Apply for {job?.title ?? "this position"}</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Your application will be screened by our AI pipeline instantly.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label>Phone <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              {/* Profile URLs */}
              <div className="space-y-1.5">
                <Label>LinkedIn URL <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>GitHub URL <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="https://github.com/yourusername"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Portfolio URL <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="https://yourportfolio.com"
                  value={form.portfolioUrl}
                  onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                />
              </div>

              {/* Resume upload */}
              <div className="space-y-1.5">
                <Label>Resume (PDF) <span className="text-red-500">*</span></Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50"
                      : resume
                      ? "border-green-400 bg-green-50"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("resume-input")?.click()}
                >
                  {resume ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <FileText className="w-5 h-5" />
                      <span className="font-medium text-sm">{resume.name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-medium">Drop your PDF here or <span className="text-indigo-600">browse</span></p>
                      <p className="text-xs text-slate-400 mt-1">PDF files only</p>
                    </div>
                  )}
                  <input
                    id="resume-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={apply.isPending}>
                {apply.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
