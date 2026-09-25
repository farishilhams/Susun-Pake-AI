// ============================================================
// lib/models/PasswordReset.ts — Mongoose schema untuk password_resets
// Skema sesuai ARCHITECTURE.md § 4 & SECURITY.md
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPasswordResetDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordResetDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "password_resets",
  }
);

// Mongoose index untuk pembersihan otomatis dokumen kedaluwarsa jika diinginkan
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const PasswordReset: Model<IPasswordResetDocument> =
  (mongoose.models.PasswordReset as Model<IPasswordResetDocument>) ||
  mongoose.model<IPasswordResetDocument>("PasswordReset", PasswordResetSchema);

export default PasswordReset;
