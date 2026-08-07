import mongoose, { type Document, type Model } from "mongoose";

export interface IJob extends Document {
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number | null;
  workflowSpecId: string | null;
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new mongoose.Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String }],
    preferredSkills: [{ type: String }],
    minExperience: { type: Number, default: null },
    workflowSpecId: { type: String, default: "default-hiring-workflow" },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

jobSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Job: Model<IJob> = mongoose.models["Job"] || mongoose.model<IJob>("Job", jobSchema);
