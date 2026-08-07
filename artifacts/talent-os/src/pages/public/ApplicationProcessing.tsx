import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Brain, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Parsing your resume…",
  "Extracting skills and experience…",
  "Analysing your GitHub profile…",
  "Matching against job requirements…",
  "Generating skill match score…",
  "Shortlisting decision in progress…",
];

export default function ApplicationProcessing() {
  const { jobId, workflowId } = useParams<{ jobId: string; workflowId: string }>();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => setDone(true), 600);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [done]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">TalentOS</span>
          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-semibold">AI</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {!done ? (
            <Card>
              <CardContent className="py-10 text-center space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">AI is reviewing your application</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Our pipeline is analysing your profile right now.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  {STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-3 text-sm">
                      {i < stepIndex ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : i === stepIndex ? (
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                      )}
                      <span
                        className={
                          i < stepIndex
                            ? "text-slate-400 line-through"
                            : i === stepIndex
                            ? "text-slate-800 font-medium"
                            : "text-slate-400"
                        }
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

                {workflowId && (
                  <p className="text-xs text-slate-400 break-all">
                    Workflow ID: {workflowId}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200">
              <CardContent className="py-10 text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Application Submitted!</h2>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Your application has been received and is being processed by our AI pipeline.
                    You'll receive an email update once the review is complete.
                  </p>
                </div>
                <Link href="/public">
                  <Button variant="outline" className="mt-2">
                    Browse more jobs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
