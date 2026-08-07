import mongoose, { type Document, type Model, type Types } from "mongoose";

export interface IChatMessage extends Document {
  recruiterId: Types.ObjectId;
  query: string;
  response: string;
  referencedReports: string[];
  createdAt: Date;
}

const chatMessageSchema = new mongoose.Schema<IChatMessage>(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    query: { type: String, required: true },
    response: { type: String, required: true },
    referencedReports: [String],
  },
  { timestamps: true },
);

chatMessageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const ChatMessage: Model<IChatMessage> =
  mongoose.models["ChatMessage"] ||
  mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
