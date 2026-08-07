import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { publicApi, type PublicJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ChevronRight, Clock, Search, X } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { formatDistanceToNow } from "date-fns";

export default function PublicJobs() {
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: () => publicApi.listJobs(),
  });

  // Collect all unique skills for filter chips
  const allSkills = useMemo(() => {
    if (!jobs) return [];
    const set = new Set<string>();
    jobs.forEach((j) => j.requiredSkills.forEach((s) => set.add(s)));
    return Array.from(set).sort().slice(0, 12);
  }, [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    let result = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (selectedSkill) {
      result = result.filter((j) => j.requiredSkills.includes(selectedSkill));
    }
    return result;
  }, [jobs, search, selectedSkill]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Open Positions</h1>
          <p className="text-slate-500 mt-2">
            Explore our current openings and apply with AI-powered screening.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search by title or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setSearch("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Skill filter chips */}
        {allSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {allSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  selectedSkill === skill
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {skill}
              </button>
            ))}
            {selectedSkill && (
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 text-center text-red-600">
              Failed to load jobs. Please try again later.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                {jobs?.length === 0 ? "No open positions at the moment." : "No jobs match your search."}
              </p>
              {(search || selectedSkill) && (
                <button
                  onClick={() => { setSearch(""); setSelectedSkill(null); }}
                  className="text-indigo-600 text-sm mt-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {filtered.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {filtered.length} {filtered.length === 1 ? "position" : "positions"} found
            </p>
            {filtered.map((job: PublicJob) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg text-slate-900">{job.title}</CardTitle>
                    <Link href={`/public/jobs/${job.id}`}>
                      <Button size="sm" className="shrink-0">
                        View &amp; Apply <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-slate-600 text-sm line-clamp-2">{job.description}</p>
                  {job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className={`text-xs cursor-pointer ${selectedSkill === skill ? "bg-indigo-100 text-indigo-700" : ""}`}
                          onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {job.minExperience}+ years
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
