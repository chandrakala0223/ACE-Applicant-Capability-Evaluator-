import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { publicApi, type PublicJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PublicNav } from "@/components/layout/PublicNav";

export default function PublicJobDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["public-job", id],
    queryFn: () => publicApi.getJob(id!),
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/public">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
          </Button>
        </Link>

        {isLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center text-red-600">
              Job not found or no longer available.
            </CardContent>
          </Card>
        )}

        {job && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-slate-900">{job.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    {job.minExperience}+ years experience required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h2 className="font-semibold text-slate-800 mb-2">About this role</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                </div>

                {job.requiredSkills.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-slate-800 mb-2">Required Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.map((skill) => (
                        <Badge key={skill} className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.preferredSkills.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-slate-800 mb-2">Nice to Have</h2>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Ready to apply?</h3>
                    <p className="text-slate-600 text-sm mt-0.5">
                      Our AI will analyse your resume and match your skills instantly.
                    </p>
                  </div>
                  <Link href={`/apply/${job.id}`}>
                    <Button size="lg" className="shrink-0">
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
