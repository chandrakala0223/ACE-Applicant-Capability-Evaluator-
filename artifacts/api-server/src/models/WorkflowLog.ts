import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IWorkflowLog extends Document {
  workflowId: Types.ObjectId;
  agentName: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "success" | "failed" | "retrying" | "skipped" | "waiting_approval";
  error?: string;
  retryCount: number;
  executionTimeMs?: number;
  confidence?: number;
  outputSummary?: string;
  createdAt: Date;
}

const workflowLogSchema = new mongoose.Schema<IWorkflowLog>(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow", required: true },
    agentName: { type: String, required: true },
    input: { type: mongoose.Schema.Types.Mixed },
    output: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["success", "failed", "retrying", "skipped", "waiting_approval"],
      required: true,
    },
    error: String,
    retryCount: { type: Number, default: 0 },
    executionTimeMs: Number,
    confidence: Number,
    outputSummary: String,
  },
  { timestamps: true },
);

workflowLogSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const WorkflowLog: Model<IWorkflowLog> =
  mongoose.models["WorkflowLog"] || mongoose.model<IWorkflowLog>("WorkflowLog", workflowLogSchema);
