import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IIntelligenceReport extends Document {
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  overallScore: number;
  matchScore: number;
  factorScores: {
    resume: number;
    skillMatching: number;
    projectEvaluation: number;
    experience: number;
    github: number;
    education: number;
    codingProfiles: number;
    portfolio: number;
  };
  hiringRecommendation: "Hire" | "Hold";
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  matchedSkills: string[];
  supportingSkills?: string[];
  missingSkills: string[];
  projectQuality?: string;
  githubQuality?: string;
  experienceAnalysis?: string;
  improvementSuggestions: string[];
  recommendedRoles: string[];
  explanation?: string;
  reasoning?: string;
  evidence: string[];
  referencedReports: string[];
  rankingPosition?: number;
  createdAt: Date;
}

const intelligenceReportSchema = new mongoose.Schema<IIntelligenceReport>(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    overallScore: { type: Number, default: 0 },
    matchScore: { type: Number, default: 0 },
    factorScores: {
      resume: { type: Number, default: 0 },
      skillMatching: { type: Number, default: 0 },
      projectEvaluation: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      github: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      codingProfiles: { type: Number, default: 0 },
      portfolio: { type: Number, default: 0 },
    },
    hiringRecommendation: { type: String, enum: ["Hire", "Hold"], required: true },
    confidence: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    matchedSkills: [String],
    supportingSkills: [String],
    missingSkills: [String],
    projectQuality: String,
    githubQuality: String,
    experienceAnalysis: String,
    improvementSuggestions: [String],
    recommendedRoles: [String],
    explanation: String,
    reasoning: String,
    evidence: [String],
    referencedReports: [String],
    rankingPosition: Number,
  },
  { timestamps: true },
);

intelligenceReportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const IntelligenceReport: Model<IIntelligenceReport> =
  mongoose.models["IntelligenceReport"] ||
  mongoose.model<IIntelligenceReport>("IntelligenceReport", intelligenceReportSchema);
