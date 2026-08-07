import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface ICandidateSlot {
  candidateId: string;
  name: string;
  email: string;
  matchScore?: number;
  rankingPosition?: number;
  githubScore?: number;
  linkedinScore?: number;
  supportingSkills: string[];
  missingSkills: string[];
  hiringRecommendation?: string;
  confidence?: number;
  betterRoleFound?: boolean;
  recommendedRole?: string;
  topProjects: string[];
  languages: string[];
  yearsOfExperience?: number;
}

export interface IComparisonResult extends Document {
  jobId: Types.ObjectId;
  candidateIds: string[];
  candidates: ICandidateSlot[];
  aiSummary?: string;
  createdAt: Date;
}

const candidateSlotSchema = new mongoose.Schema(
  {
    candidateId: String,
    name: String,
    email: String,
    matchScore: Number,
    rankingPosition: Number,
    githubScore: Number,
    linkedinScore: Number,
    supportingSkills: [String],
    missingSkills: [String],
    hiringRecommendation: String,
    confidence: Number,
    betterRoleFound: Boolean,
    recommendedRole: String,
    topProjects: [String],
    languages: [String],
    yearsOfExperience: Number,
  },
  { _id: false },
);

const comparisonResultSchema = new mongoose.Schema<IComparisonResult>(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateIds: [String],
    candidates: [candidateSlotSchema],
    aiSummary: String,
  },
  { timestamps: true },
);

comparisonResultSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const ComparisonResult: Model<IComparisonResult> =
  mongoose.models["ComparisonResult"] ||
  mongoose.model<IComparisonResult>("ComparisonResult", comparisonResultSchema);
