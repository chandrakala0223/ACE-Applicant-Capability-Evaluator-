import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  experience?: number;
  education?: string;
  resumeSummary?: string;
  workExperience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    responsibilities?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    link?: string;
    technologies?: string[];
    role?: string;
  }>;
  certifications?: string[];
  languages?: string[];
  achievements?: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string;
  codeforcesUrl?: string;
  hackerrankUrl?: string;
}

export interface ICandidate extends Document {
  name: string;
  email: string;
  phone?: string;
  jobId: Types.ObjectId;
  resumeUrl?: string;
  parsedResume?: IParsedResume;
  matchScore?: number;
  status: "pending" | "shortlisted" | "hold" | "rejected" | "approved";
  workflowId?: Types.ObjectId;
  overallScore?: number;
  rank?: number;
  resumeScore?: number;
  githubScore?: number;
  skillScore?: number;
  projectScore?: number;
  experienceScore?: number;
  educationScore?: number;
  portfolioScore?: number;
  codingScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

const parsedResumeSchema = new mongoose.Schema(
  {
    // Identity
    name: String,
    email: String,
    phone: String,
    location: String,

    // Core signals
    skills: [String],
    experience: Number,
    education: String,
    resumeSummary: String,

    // Detailed
    workExperience: [
      new mongoose.Schema(
        {
          company: String,
          title: String,
          startDate: String,
          endDate: String,
          description: String,
          responsibilities: [String],
        },
        { _id: false },
      ),
    ],
    projects: [
      new mongoose.Schema(
        {
          name: String,
          description: String,
          link: String,
          technologies: [String],
          role: String,
        },
        { _id: false },
      ),
    ],
    certifications: [String],
    languages: [String],
    achievements: [String],

    // External profiles
    githubUrl: String,
    linkedinUrl: String,
    portfolioUrl: String,
    leetcodeUrl: String,
    codeforcesUrl: String,
    hackerrankUrl: String,
  },
  { _id: false },
);

const candidateSchema = new mongoose.Schema<ICandidate>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    resumeUrl: String,
    parsedResume: parsedResumeSchema,
    matchScore: Number,
    status: {
      type: String,
      enum: ["pending", "shortlisted", "hold", "rejected", "approved"],
      default: "pending",
    },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow" },
    overallScore: { type: Number, default: 0 },
    rank: Number,
    resumeScore: { type: Number, default: 0 },
    githubScore: { type: Number, default: 0 },
    skillScore: { type: Number, default: 0 },
    projectScore: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 },
    educationScore: { type: Number, default: 0 },
    portfolioScore: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    recommendation: String,
    confidence: Number,
  },
  { timestamps: true },
);

candidateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Candidate: Model<ICandidate> =
  mongoose.models["Candidate"] || mongoose.model<ICandidate>("Candidate", candidateSchema);
