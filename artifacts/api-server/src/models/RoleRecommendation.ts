import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IRecommendedRole {
  jobId: string;
  roleTitle: string;
  matchScore: number;
  explanation?: string;
  confidence?: number;
}

export interface IRoleRecommendation extends Document {
  candidateId: Types.ObjectId;
  appliedJobId: Types.ObjectId;
  recommendedRoles: IRecommendedRole[];
  confidence: number;
  reasoning?: string;
  referencedReports: string[];
  createdAt: Date;
}

const roleRecommendationSchema = new mongoose.Schema<IRoleRecommendation>(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    appliedJobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    recommendedRoles: [{ jobId: String, roleTitle: String, matchScore: Number, explanation: String, confidence: Number, _id: false }],
    confidence: { type: Number, default: 0 },
    reasoning: String,
    referencedReports: [String],
  },
  { timestamps: true },
);

roleRecommendationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const RoleRecommendation: Model<IRoleRecommendation> =
  mongoose.models["RoleRecommendation"] ||
  mongoose.model<IRoleRecommendation>("RoleRecommendation", roleRecommendationSchema);
