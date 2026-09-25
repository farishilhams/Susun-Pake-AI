// ============================================================
// lib/models/ChatHistory.ts — Mongoose schema untuk riwayat chat
// Menyimpan interview + refinement conversation per project
// Skema sesuai ARCHITECTURE.md § 4
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IChatDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  role: "user" | "assistant" | "system";
  message: string;
  phase: "interview" | "refinement";
  createdAt: Date;
}

const ChatHistorySchema = new Schema<IChatDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    phase: {
      type: String,
      enum: ["interview", "refinement"],
      default: "interview",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ChatHistory: Model<IChatDocument> =
  (mongoose.models.ChatHistory as Model<IChatDocument>) ||
  mongoose.model<IChatDocument>("ChatHistory", ChatHistorySchema);

export default ChatHistory;
