import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface ILinkedInReport extends Document {
  candidateId: Types.ObjectId;
  linkedinScore: number;
  experienceSummary?: Record<string, unknown>;
  careerProgression?: string;
  education: string[];
  certifications: string[];
  skills: string[];
  yearsOfExperience?: number;
  confidence: number;
  explanation?: string;
  evidence: string[];
  supportingSkills: string[];
  missingSkills: string[];
  reasoning?: string;
  referencedReports: string[];
  createdAt: Date;
}

const linkedInReportSchema = new mongoose.Schema<ILinkedInReport>(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    linkedinScore: { type: Number, default: 0 },
    experienceSummary: { type: mongoose.Schema.Types.Mixed },
    careerProgression: String,
    education: [String],
    certifications: [String],
    skills: [String],
    yearsOfExperience: Number,
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

linkedInReportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const LinkedInReport: Model<ILinkedInReport> =
  mongoose.models["LinkedInReport"] ||
  mongoose.model<ILinkedInReport>("LinkedInReport", linkedInReportSchema);
