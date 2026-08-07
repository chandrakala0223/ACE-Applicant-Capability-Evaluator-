import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IWorkflow extends Document {
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  currentState: string;
  status: "running" | "paused" | "completed" | "failed";
  checkpoint?: Record<string, unknown>;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new mongoose.Schema<IWorkflow>(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    currentState: { type: String, default: "resume_parser" },
    status: {
      type: String,
      enum: ["running", "paused", "completed", "failed"],
      default: "running",
    },
    checkpoint: { type: mongoose.Schema.Types.Mixed, default: {} },
    completedAt: Date,
  },
  { timestamps: true },
);

workflowSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Workflow: Model<IWorkflow> =
  mongoose.models["Workflow"] || mongoose.model<IWorkflow>("Workflow", workflowSchema);
