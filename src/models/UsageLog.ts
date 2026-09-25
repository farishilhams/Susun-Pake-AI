// ============================================================
// lib/models/UsageLog.ts — Mongoose schema untuk rate limiting
// Counter generate per user per hari, reset otomatis tiap hari baru.
// Skema sesuai ARCHITECTURE.md § 4 dan § 2.3
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUsageLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // format "YYYY-MM-DD" UTC
  generateCount: number;
}

const UsageLogSchema = new Schema<IUsageLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      // format: YYYY-MM-DD (UTC) — konsisten dengan getUTCDateString()
    },
    generateCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Index compound untuk query cepat "berapa generate user X hari ini?"
UsageLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const UsageLog: Model<IUsageLogDocument> =
  (mongoose.models.UsageLog as Model<IUsageLogDocument>) ||
  mongoose.model<IUsageLogDocument>("UsageLog", UsageLogSchema);

export default UsageLog;
