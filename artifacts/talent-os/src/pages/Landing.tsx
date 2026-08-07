import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Briefcase, ChevronRight, Github, Linkedin, Star, Check,
  ArrowRight, Zap, Search, BarChart3, Users, Shield, Globe, Clock,
  Code2, FileText, Trophy, Sparkles, ChevronDown, Mail, Twitter,
  MapPin, Layers, TrendingUp, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/layout/PublicNav";
import { publicApi, type PublicJob } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setCount(Math.floor(start));
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return { count, ref };
}

// ─── Section fade-in wrapper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── FAQ Accordion ───────────────────────────────────────────────────────────
const faqs = [
  { q: "How does ACE AI screening work?", a: "When you submit your application, our AI pipeline automatically parses your resume, evaluates your GitHub contributions, analyzes your LinkedIn profile and portfolio, matches your skills against the job requirements, and generates a comprehensive evaluation score — all within minutes." },
  { q: "Is my data safe?", a: "Yes. Your data is encrypted in transit and at rest. We only share your profile with the specific recruiters you apply to, and you can request deletion at any time." },
  { q: "How long does the AI review take?", a: "The full AI pipeline typically completes within 2–5 minutes of submission. You can watch the live progress on your application page." },
  { q: "What makes ACE different from other job boards?", a: "Unlike traditional job boards, ACE uses deep AI analysis across your entire professional footprint — code quality, project depth, skill semantics — not just keyword matching." },
  { q: "Can recruiters contact me directly?", a: "If your application is shortlisted, the recruiting team will reach out to you via the email you provided during the application." },
  { q: "Is ACE free for job seekers?", a: "Yes, applying through ACE is completely free for job seekers. Our AI-powered screening is offered as a value-add to help you get matched to the right opportunities faster." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-slate-600 text-sm leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Job card (featured jobs from real API) ───────────────────────────────────
function FeaturedJobCard({ job, index }: { job: PublicJob; index: number }) {
  return (
    <FadeIn delay={index * 0.08}>
      <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-blue-200 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Open
            </Badge>
          </div>
          <h3 className="font-semibold text-slate-900 text-base mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
            {job.title}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.requiredSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 3 && (
              <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">
                +{job.requiredSkills.length - 3}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{job.minExperience}+ yrs exp</span>
            </div>
            <Link href={`/public/jobs/${job.id}`}>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Apply <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

// ─── Stat card (hook must live inside a component, not inside .map()) ─────────
function StatCard({ label, value, suffix, icon: Icon }: { label: string; value: number; suffix: string; icon: React.ElementType }) {
  const { count, ref } = useCounter(value);
  return (
    <div ref={ref} className="text-center">
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-4xl font-bold text-white mb-1">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-blue-100 text-sm font-medium">{label}</div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Landing() {
  const { data: jobs } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: () => publicApi.listJobs(),
  });

  const featured = jobs?.slice(0, 6) ?? [];

  const stats = [
    { label: "Jobs Posted", value: 1240, suffix: "+", icon: Briefcase },
    { label: "AI Screenings", value: 8500, suffix: "+", icon: Zap },
    { label: "Companies", value: 340, suffix: "+", icon: Globe },
    { label: "Successful Placements", value: 92, suffix: "%", icon: Trophy },
  ];

  const features = [
    { icon: FileText, title: "AI Resume Parsing", desc: "Deep semantic extraction of skills, experience, and achievements" },
    { icon: Github, title: "GitHub Analysis", desc: "Code quality, activity, and project complexity evaluation" },
    { icon: Linkedin, title: "LinkedIn Analysis", desc: "Professional history and endorsement signal processing" },
    { icon: Globe, title: "Portfolio Review", desc: "Design, UX, and project presentation assessment" },
    { icon: Code2, title: "Coding Profiles", desc: "LeetCode, HackerRank, and competitive programming metrics" },
    { icon: Search, title: "Semantic Skill Matching", desc: "Vector similarity matching beyond keyword search" },
    { icon: Layers, title: "Project Evaluation", desc: "End-to-end project quality and impact scoring" },
    { icon: BarChart3, title: "Candidate Ranking", desc: "Multi-dimensional ranking with explainable scoring" },
    { icon: MessageSquare, title: "Interview Questions", desc: "AI-generated role-specific interview question sets" },
    { icon: Sparkles, title: "Hiring Recommendation", desc: "Confident, data-backed accept/reject signals for recruiters" },
  ];

  const steps = [
    { n: "01", title: "Browse Jobs", desc: "Explore open positions across categories" },
    { n: "02", title: "View Job Details", desc: "See full requirements and company context" },
    { n: "03", title: "Upload Resume", desc: "Submit your CV along with your profile links" },
    { n: "04", title: "AI Resume Analysis", desc: "Deep parsing and information extraction" },
    { n: "05", title: "Skill Matching", desc: "Semantic comparison against job requirements" },
    { n: "06", title: "Recruiter Review", desc: "Human-in-the-loop approval workflow" },
    { n: "07", title: "Interview Invitation", desc: "Selected candidates get a direct invitation" },
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "Software Engineer", company: "Hired via ACE", text: "The AI matched me to a role that perfectly fit my GitHub portfolio and skills. Got an interview in 3 days!", avatar: "PS", type: "Candidate" },
    { name: "James Okafor", role: "Head of Talent", company: "FinTech Startup", text: "ACE cut our screening time by 80%. The AI shortlist is remarkably accurate — better signal-to-noise than anything we've tried.", avatar: "JO", type: "Recruiter" },
    { name: "Mei Lin", role: "Product Designer", company: "Design Lead hired", text: "The portfolio review feature is what got me noticed. The AI actually understood my case studies and matched me accurately.", avatar: "ML", type: "Candidate" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/60 to-indigo-50/80 pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/60 to-indigo-100/60 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-purple-100/50 to-sky-100/50 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6"
              >
                See Beyond the{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Resume.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl"
              >
                ACE is an AI-powered candidate evaluation platform that analyzes resumes, GitHub repositories, portfolios, technical skills, education, and experience to generate an overall candidate score and intelligent ranking, helping recruiters make faster, smarter, and more confident hiring decisions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-3"
              >
                <Link href="/public">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-blue-200 h-12 px-7 text-base">
                    Find Jobs <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/public">
                  <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-7 text-base">
                    Upload Resume
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right: AI illustration */}
            <div className="relative hidden lg:flex items-center justify-center">
              {/* Central orb */}
              <motion.div
                animate={{ scale: [1, 1.04, 1], rotate: [0, 3, 0, -3, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-72 h-72"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-2xl" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl">
                    <Brain className="w-12 h-12 text-white" />
                  </div>
                </div>
                {/* Orbit dots */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <motion.div
                    key={deg}
                    className="absolute w-2.5 h-2.5 rounded-full bg-blue-400"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: `rotate(${deg}deg) translate(130px) translateX(-50%) translateY(-50%)`,
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, delay: deg / 200, repeat: Infinity }}
                  />
                ))}
              </motion.div>

              {/* Floating feature cards */}
              {[
                { label: "Resume Analysis", icon: FileText, x: -160, y: -110, color: "blue" },
                { label: "AI Match Score", icon: Star, x: 160, y: -90, color: "indigo" },
                { label: "GitHub Review", icon: Github, x: -170, y: 80, color: "purple" },
                { label: "Interview Ready", icon: Check, x: 155, y: 100, color: "emerald" },
              ].map(({ label, icon: Icon, x, y, color }, i) => (
                <motion.div
                  key={label}
                  className="absolute"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  animate={{ y: [y - 6, y + 6, y - 6] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white shadow-lg border backdrop-blur-sm whitespace-nowrap",
                    color === "blue" && "border-blue-100",
                    color === "indigo" && "border-indigo-100",
                    color === "purple" && "border-purple-100",
                    color === "emerald" && "border-emerald-100",
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                      color === "blue" && "bg-blue-100",
                      color === "indigo" && "bg-indigo-100",
                      color === "purple" && "bg-purple-100",
                      color === "emerald" && "bg-emerald-100",
                    )}>
                      <Icon className={cn(
                        "w-3.5 h-3.5",
                        color === "blue" && "text-blue-600",
                        color === "indigo" && "text-indigo-600",
                        color === "purple" && "text-purple-600",
                        color === "emerald" && "text-emerald-600",
                      )} />
                    </div>
                    <span className="text-sm font-medium text-slate-800">✓ {label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Jobs ── */}
      <section id="jobs" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-200">Open Positions</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {jobs?.length ? `${jobs.length} Open Position${jobs.length !== 1 ? "s" : ""}` : "Featured Opportunities"}
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Apply with AI-powered screening. Get matched to roles that fit your actual skills.
            </p>
          </FadeIn>

          {featured.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {featured.map((job, i) => (
                  <FeaturedJobCard key={job.id} job={job} index={i} />
                ))}
              </div>
              <FadeIn className="text-center">
                <Link href="/public">
                  <Button variant="outline" size="lg" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    View All Positions <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </FadeIn>
            </>
          ) : (
            <FadeIn>
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Positions loading…</p>
                <p className="text-slate-400 text-sm mt-1">Live job data will appear here once connected.</p>
                <Link href="/public">
                  <Button className="mt-4" variant="outline">Browse All Jobs</Button>
                </Link>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ── Statistics ── */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ label, value, suffix, icon: Icon }) => (
              <StatCard key={label} label={label} value={value} suffix={suffix} icon={Icon} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="about" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-200">Process</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-500 text-lg">From job discovery to interview — guided by AI every step.</p>
          </FadeIn>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-300 via-indigo-300 to-purple-300 hidden sm:block" />

            <div className="space-y-6">
              {steps.map(({ n, title, desc }, i) => (
                <FadeIn key={n} delay={i * 0.07}>
                  <div className="flex gap-6 items-start">
                    <div className="relative flex flex-col items-center shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg z-10">
                        <span className="text-white text-xs font-bold">{n}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 flex-1 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                      <p className="text-slate-500 text-sm">{desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why ACE ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <Badge className="mb-4 bg-emerald-50 text-emerald-700 border-emerald-200">Capabilities</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Why ACE</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Every dimension of your professional profile is evaluated by specialized AI agents.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 0.05}>
                <div className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg transition-all duration-300 cursor-default h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center mb-3 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <Badge className="mb-4 bg-purple-50 text-purple-700 border-purple-200">Reviews</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">What People Are Saying</h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, company, text, avatar, type }, i) => (
              <FadeIn key={name} delay={i * 0.1}>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5">"{text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{name}</p>
                      <p className="text-slate-500 text-xs">{role} · {company}</p>
                    </div>
                    <Badge className="ml-auto text-xs" variant="outline">{type}</Badge>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <Badge className="mb-4 bg-slate-100 text-slate-600 border-slate-200">FAQ</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-2xl border border-slate-200 px-6 divide-y-0">
              {faqs.map((faq) => (
                <FAQItem key={faq.q} {...faq} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section id="companies" className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Find Your Next Opportunity?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of candidates who have been matched to their dream roles using AI-powered hiring.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/public">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 border-0 h-12 px-8 text-base font-semibold shadow-lg">
                  Browse All Jobs <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 px-8 text-base">
                  Recruiter Portal
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg">ACE</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                AI-powered candidate evaluation platform that goes beyond traditional resume screening to generate overall capability scores and candidate rankings.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Platform</p>
              <div className="space-y-2 text-sm">
                <Link href="/public" className="block hover:text-white transition-colors">Browse Jobs</Link>
                <Link href="/login" className="block hover:text-white transition-colors">Recruiter Portal</Link>
                <a href="#about" className="block hover:text-white transition-colors">How It Works</a>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Connect</p>
              <div className="space-y-2 text-sm">
                <a href="#contact" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" /> Contact
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <p>© 2026 ACE. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
