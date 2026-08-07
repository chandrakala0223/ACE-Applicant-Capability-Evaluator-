import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IGitHubRepo {
  name: string;
  description?: string;
  language?: string;
  stars: number;
  complexity: string;
}

export interface IGitHubReport extends Document {
  candidateId: Types.ObjectId;
  githubUrl?: string;
  githubScore: number;
  strengths: string[];
  weaknesses: string[];
  languages: string[];
  topRepositories: IGitHubRepo[];
  commitActivity?: string;
  readmeQuality?: string;
  openSourceContributions?: string;
  dockerCicdUsage?: boolean;
  confidence: number;
  explanation?: string;
  evidence: string[];
  supportingSkills: string[];
  missingSkills: string[];
  reasoning?: string;
  referencedReports: string[];
  createdAt: Date;
}

const gitHubReportSchema = new mongoose.Schema<IGitHubReport>(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    githubUrl: String,
    githubScore: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    languages: [String],
    topRepositories: [{ name: String, description: String, language: String, stars: Number, complexity: String, _id: false }],
    commitActivity: String,
    readmeQuality: String,
    openSourceContributions: String,
    dockerCicdUsage: Boolean,
    confidence: { type: Number, default: 0 },
    explanation: String,
    evidence: [String],
    supportingSkills: [String],
    missingSkills: [String],
    reasoning: String,
    referencedReports: [String],
  },
  { timestamps: true },
);

gitHubReportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const GitHubReport: Model<IGitHubReport> =
  mongoose.models["GitHubReport"] ||
  mongoose.model<IGitHubReport>("GitHubReport", gitHubReportSchema);
